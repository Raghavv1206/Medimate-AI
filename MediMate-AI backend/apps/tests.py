from datetime import date, time, timedelta
from unittest.mock import patch
from typing import Any, cast
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.patients.models import PatientProfile, Caretaker
from apps.medicines.models import Medicine, MedicineSchedule
from apps.doses.models import DoseLog
from apps.escalation.models import EscalationLog
from services.ai_service import calculate_risk_score

User = get_user_model()

class MediMateTests(APITestCase):
    patient_user: Any
    caretaker_user: Any
    patient_profile: PatientProfile
    caretaker_profile: Caretaker
    medicine: Medicine

    def setUp(self):
        # Create users
        user_objects = cast(Any, User.objects)
        self.patient_user = user_objects.create_user(
            username='patient1',
            email='patient1@example.com',
            password='password123',
            full_name='John Doe',
            whatsapp_number='1234567890',
            role='patient'
        )
        self.caretaker_user = user_objects.create_user(
            username='caretaker1',
            email='caretaker1@example.com',
            password='password123',
            full_name='Jane Caretaker',
            whatsapp_number='0987654321',
            role='caretaker'
        )
        
        # Create profiles
        self.patient_profile = PatientProfile.objects.create(
            user=self.patient_user,
            age=30,
            gender='male',
            emergency_phone='5551234567'
        )
        self.caretaker_profile = Caretaker.objects.create(
            user=self.caretaker_user,
            phone='0987654321',
            is_primary=True
        )
        self.caretaker_profile.patients.add(self.patient_profile)

        # Create medicine
        self.medicine = Medicine.objects.create(
            name='Aspirin',
            dosage='100mg',
            instructions='Take after lunch'
        )

    def test_dose_log_auto_generated(self):
        """Feature #19: Auto Dose Log Generation (post_save signal)."""
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
            is_active=True
        )
        # Should generate 6 DoseLog entries (start_date to end_date inclusive)
        logs = DoseLog.objects.filter(schedule=schedule)
        self.assertEqual(logs.count(), 6)

    def test_duplicate_taken_rejected(self):
        """Feature #26: Returns 409 Conflict if dose is already marked as taken."""
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            is_active=True
        )
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        
        # Authenticate client with JWT
        refresh = RefreshToken.for_user(self.patient_user)
        cast(Any, self.client).credentials(HTTP_AUTHORIZATION=f'Bearer {cast(Any, refresh).access_token}')
        
        # First take should succeed
        resp1 = self.client.post(f'/api/doses/{dose.id}/take/')
        self.assertEqual(resp1.status_code, 200)
        
        # Second take should return 409
        resp2 = self.client.post(f'/api/doses/{dose.id}/take/')
        self.assertEqual(resp2.status_code, 409)


    def test_risk_score_formula(self):
        """Feature #45: Test risk scoring formula calculations."""
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today() - timedelta(days=5),
            is_active=True
        )
        
        # Mark all past 5 doses as missed to simulate high-risk behavior
        DoseLog.objects.filter(schedule=schedule).update(status='missed')
        
        assert self.patient_profile is not None
        risk = calculate_risk_score(self.patient_profile.id)
        self.assertGreaterEqual(risk['score'], 50)
        self.assertEqual(risk['level'], 'high' if risk['score'] < 75 else 'critical')

    def test_webhook_reply_1_marks_taken(self):
        """Test that replying '1' to WhatsApp webhook marks the dose as taken."""
        from apps.whatsapp.models import WhatsAppInteraction
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            is_active=True
        )
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        
        # Create a WhatsAppInteraction record matching this dose
        WhatsAppInteraction.objects.create(
            dose_log=dose,
            patient=self.patient_profile,
            whatsapp_number='1234567890',
            message_sent='Reminder text'
        )
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "1234567890",
                            "text": {"body": "1"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        resp = self.client.post('/api/whatsapp/webhook/', payload, format='json')
        self.assertEqual(resp.status_code, 200)
        
        # Refresh dose and assert
        dose.refresh_from_db()
        self.assertEqual(dose.status, 'taken')
        self.assertIsNotNone(dose.taken_at)

    def test_webhook_reply_2_reschedules(self):
        """Test that replying '2' to WhatsApp webhook reschedules the dose by 15 minutes."""
        from apps.whatsapp.models import WhatsAppInteraction
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            is_active=True
        )
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        
        WhatsAppInteraction.objects.create(
            dose_log=dose,
            patient=self.patient_profile,
            whatsapp_number='1234567890',
            message_sent='Reminder text'
        )
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "1234567890",
                            "text": {"body": "2"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        resp = self.client.post('/api/whatsapp/webhook/', payload, format='json')
        self.assertEqual(resp.status_code, 200)
        
        dose.refresh_from_db()
        self.assertEqual(dose.status, 'pending')
        self.assertFalse(dose.reminder_sent)

    def test_webhook_reply_3_triggers_escalation(self):
        """Test that replying '3' to WhatsApp webhook marks dose as skipped and triggers alert."""
        from apps.whatsapp.models import WhatsAppInteraction
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            is_active=True
        )
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        
        WhatsAppInteraction.objects.create(
            dose_log=dose,
            patient=self.patient_profile,
            whatsapp_number='1234567890',
            message_sent='Reminder text'
        )
        
        payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "messages": [{
                            "from": "1234567890",
                            "text": {"body": "3"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }
        
        # Add testserver to ALLOWED_HOSTS if needed for webhook view
        resp = self.client.post('/api/whatsapp/webhook/', payload, format='json')
        self.assertEqual(resp.status_code, 200)
        
        dose.refresh_from_db()
        self.assertEqual(dose.status, 'skipped')
        self.assertTrue(dose.escalated)

    @patch('scheduler.jobs.timezone.localtime')
    def test_reminder_scheduler_flow(self, mock_localtime):
        """
        Verify that:
        1. The first reminder is sent immediately at scheduled_time (0 min late).
        2. The second reminder is sent exactly 15 min late if status is still pending and only 1 interaction exists.
        3. No subsequent reminders are sent.
        """
        from scheduler.jobs import check_pending_reminders
        from apps.whatsapp.models import WhatsAppInteraction
        
        # Define base test date and time: June 18, 2026 at 18:09:00
        test_datetime = timezone.make_aware(
            timezone.datetime(2026, 6, 18, 18, 9, 0)
        )
        
        # Create schedule at 18:09
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(18, 9),
            start_date=date(2026, 6, 18),
            is_active=True
        )
        
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        self.assertIsNotNone(dose)
        self.assertEqual(dose.status, 'pending')
        self.assertFalse(dose.reminder_sent)
        
        # Scenario 1: Run scheduler before scheduled time (e.g. 18:08:00)
        mock_localtime.return_value = test_datetime - timedelta(minutes=1)
        check_pending_reminders()
        
        dose.refresh_from_db()
        self.assertFalse(dose.reminder_sent)
        self.assertEqual(WhatsAppInteraction.objects.filter(dose_log=dose).count(), 0)
        
        # Scenario 2: Run scheduler at scheduled time (18:09:00)
        mock_localtime.return_value = test_datetime
        check_pending_reminders()
        
        dose.refresh_from_db()
        self.assertTrue(dose.reminder_sent)
        # 1 interaction should be created
        self.assertEqual(WhatsAppInteraction.objects.filter(dose_log=dose).count(), 1)
        
        # Scenario 3: Run scheduler at 18:23:00 (14 min late) -> should not send follow-up yet
        mock_localtime.return_value = test_datetime + timedelta(minutes=14)
        check_pending_reminders()
        
        self.assertEqual(WhatsAppInteraction.objects.filter(dose_log=dose).count(), 1)
        
        # Scenario 4: Run scheduler at 18:24:00 (15 min late) -> should send follow-up
        mock_localtime.return_value = test_datetime + timedelta(minutes=15)
        check_pending_reminders()
        
        # 2 interactions should be created now
        self.assertEqual(WhatsAppInteraction.objects.filter(dose_log=dose).count(), 2)
        
        # Scenario 5: Run scheduler again at 18:25:00 -> should not send another follow-up
        mock_localtime.return_value = test_datetime + timedelta(minutes=16)
        check_pending_reminders()
        
        self.assertEqual(WhatsAppInteraction.objects.filter(dose_log=dose).count(), 2)

    @patch('scheduler.jobs.timezone.localtime')
    def test_escalation_and_voice_call_scheduler_flow(self, mock_localtime):
        """
        Verify that:
        1. A dose log is escalated exactly after 45 minutes of being pending.
        2. A voice call is attempted exactly after 75 minutes of being pending.
        """
        from scheduler.jobs import check_escalations, check_voice_calls
        
        test_datetime = timezone.make_aware(
            timezone.datetime(2026, 6, 18, 18, 9, 0)
        )
        
        schedule = MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=self.medicine,
            scheduled_time=time(18, 9),
            start_date=date(2026, 6, 18),
            is_active=True
        )
        
        dose = DoseLog.objects.filter(schedule=schedule).first()
        assert dose is not None
        
        # Check escalation before 45 minutes (e.g. 44 min late, 18:53)
        mock_localtime.return_value = test_datetime + timedelta(minutes=44)
        check_escalations()
        dose.refresh_from_db()
        self.assertFalse(dose.escalated)
        
        # Check escalation at 45 minutes (18:54)
        mock_localtime.return_value = test_datetime + timedelta(minutes=45)
        check_escalations()
        dose.refresh_from_db()
        self.assertTrue(dose.escalated)
        
        # Check voice call before 75 minutes (e.g. 74 min late, 19:23)
        mock_localtime.return_value = test_datetime + timedelta(minutes=74)
        check_voice_calls()
        dose.refresh_from_db()
        self.assertFalse(dose.call_attempted)
        
        # Check voice call at 75 minutes (19:24)
        mock_localtime.return_value = test_datetime + timedelta(minutes=75)
        check_voice_calls()
        dose.refresh_from_db()
        self.assertTrue(dose.call_attempted)

    def test_duplicate_active_ingredient_warning(self):
        """Test that scheduling a duplicate active ingredient medicine within 2 hours warns the user."""
        from apps.medicines.models import MedicineAICache, Medicine
        
        # Seed cache
        MedicineAICache.objects.create(medicine_name="Crocin", active_ingredient="Paracetamol")
        MedicineAICache.objects.create(medicine_name="Dolo", active_ingredient="Paracetamol")
        
        # Create medicines
        crocin = Medicine.objects.create(name="Crocin", dosage="500mg", patient=self.patient_profile)
        dolo = Medicine.objects.create(name="Dolo", dosage="650mg", patient=self.patient_profile)
        
        # Create an active schedule for Crocin at 14:00
        MedicineSchedule.objects.create(
            patient=self.patient_profile,
            medicine=crocin,
            scheduled_time=time(14, 0),
            start_date=date.today(),
            is_active=True
        )
        
        # Authenticate client with JWT
        refresh = RefreshToken.for_user(self.patient_user)
        cast(Any, self.client).credentials(HTTP_AUTHORIZATION=f"Bearer {cast(Any, refresh).access_token}")
        
        # Try to schedule Dolo at 15:00 (within 2-hour window, same active ingredient)
        payload = {
            "medicine_id": dolo.id,
            "scheduled_time": "15:00",
            "start_date": str(date.today())
        }
        resp = cast(Any, self.client).post('/api/medicines/schedules/', payload, format='json')
        
        # Should return 409 Conflict with warning
        self.assertEqual(resp.status_code, 409)
        self.assertTrue(resp.data['is_duplicate'])
        self.assertIn("Paracetamol", resp.data['warning'])
        
        # Now try to schedule with ignore_warning=True
        payload["ignore_warning"] = True
        resp2 = cast(Any, self.client).post('/api/medicines/schedules/', payload, format='json')
        self.assertEqual(resp2.status_code, 201)



