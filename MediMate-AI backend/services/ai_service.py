import logging
from datetime import date, timedelta
from django.db.models import Count, Q
from apps.doses.models import DoseLog

logger = logging.getLogger(__name__)

def calculate_risk_score(patient_id: int) -> dict:
    """
    Feature #45, #46, #47, #48: Deterministic risk engine using 5 factors.
    Returns genuine insights based on actual dose history data.
    
    Args:
        patient_id: The patient ID to calculate risk for
        
    Returns:
        dict: Containing risk score, level, insight, and detailed breakdown.
              If no dose history exists, returns appropriate onboarding insight.
    """
    from apps.medicines.models import MedicineSchedule
    
    today = date.today()
    week_ago = today - timedelta(days=7)
    base_score = 0.0

    # Check if patient has any dose history at all
    total_doses_ever = DoseLog.objects.filter(patient_id=patient_id).count()
    
    # Check if patient has any active medicine schedules
    active_schedules = MedicineSchedule.objects.filter(
        patient_id=patient_id, is_active=True
    ).count()
    
    # If no medicines scheduled or no dose history, return onboarding insight
    if active_schedules == 0:
        return {
            'score': 0,
            'level': 'onboarding',
            'insight': "Let's get started! Add your medicines to get personalized adherence insights. 🏥",
            'factors': {
                'miss_rate_7d': 0,
                'slot_streak': 0,
                'active_medicines': 0,
                'consecutive_missed_days': 0,
                'has_dose_history': False,
            },
            'has_sufficient_data': False,
        }
    
    # Check if there's ANY dose history (even old data helps context)
    if total_doses_ever == 0:
        return {
            'score': 0,
            'level': 'onboarding',
            'insight': "We're ready to learn your patterns! Start logging doses to get personalized insights. 📊",
            'factors': {
                'miss_rate_7d': 0,
                'slot_streak': 0,
                'active_medicines': active_schedules,
                'consecutive_missed_days': 0,
                'has_dose_history': False,
            },
            'has_sufficient_data': False,
        }

    # Factor 1: Recent miss rate (last 7 days) — up to 50 points
    recent = DoseLog.objects.filter(
        patient_id=patient_id,
        scheduled_date__gte=week_ago,
        scheduled_date__lte=today,
    )
    total_7d = recent.count()
    missed_7d = recent.filter(status__in=['missed', 'skipped']).count()
    
    # If no doses scheduled in last 7 days, check last 30 days for at least 3 data points
    if total_7d == 0:
        month_ago = today - timedelta(days=30)
        recent_30d = DoseLog.objects.filter(
            patient_id=patient_id,
            scheduled_date__gte=month_ago,
            scheduled_date__lte=today,
        )
        if recent_30d.count() < 3:
            return {
                'score': 0,
                'level': 'onboarding',
                'insight': "Keep logging! We need at least 3 doses to analyze your patterns. 📝",
                'factors': {
                    'miss_rate_7d': 0,
                    'slot_streak': 0,
                    'active_medicines': active_schedules,
                    'consecutive_missed_days': 0,
                    'has_dose_history': True,
                    'doses_logged': recent_30d.count(),
                },
                'has_sufficient_data': False,
            }
        # Use 30-day data as fallback
        total_7d = recent_30d.count()
        recent = recent_30d
        missed_7d = recent_30d.filter(status__in=['missed', 'skipped']).count()
    
    miss_rate = missed_7d / total_7d if total_7d > 0 else 0.0
    base_score += miss_rate * 50

    # Factor 2: Consecutive missed slots — up to 20 points
    recent_ordered = recent.order_by('-scheduled_date', '-scheduled_time')
    streak = 0
    for dose in recent_ordered:
        if dose.status in ('missed', 'skipped'):
            streak += 1
        else:
            break
    if streak >= 3:
        base_score += 20

    # Factor 3: Medicine complexity — up to 10 points
    if active_schedules >= 4:
        base_score += 10

    # Factor 4: Day-of-week pattern — up to 10 points
    day_misses = DoseLog.objects.filter(
        patient_id=patient_id, status='missed'
    ).values('scheduled_date__week_day').annotate(
        count=Count('id')
    ).order_by('-count').first()
    if day_misses:
        # Django week_day: 1=Sunday, 2=Monday, etc.
        today_weekday = today.isoweekday() % 7 + 1
        if day_misses['scheduled_date__week_day'] == today_weekday:
            base_score += 10

    # Factor 5: Consecutive missed DAYS — up to 10 points
    consec_days = 0
    check = today - timedelta(days=1)
    for _ in range(7):
        day_doses = DoseLog.objects.filter(patient_id=patient_id, scheduled_date=check)
        if day_doses.exists() and not day_doses.filter(status='taken').exists():
            consec_days += 1
            check -= timedelta(days=1)
        else:
            break
    if consec_days >= 2:
        base_score += 10

    risk_score = min(round(base_score), 100)
    
    # Determine risk level with thresholds
    if risk_score < 25:
        level = 'low'
    elif risk_score < 50:
        level = 'medium'
    elif risk_score < 75:
        level = 'high'
    else:
        level = 'critical'
    
    # GENUINE insights based on actual risk and data
    insights = {
        'low': f"Great adherence! You're taking {100-risk_score}% of doses consistently. Keep up the excellent work! 💚",
        'medium': f"Your adherence is at {100-risk_score}%. Some doses were missed recently—try adjusting your reminders. 💛",
        'high': f"Your adherence is at {100-risk_score}%. Multiple doses were missed. Consider caretaker support. 🧡",
        'critical': f"Your adherence is at {100-risk_score}%. Urgent: Multiple consecutive missed doses detected. Please take action! ❤️",
    }

    return {
        'score': risk_score,
        'level': level,
        'insight': insights[level],
        'factors': {
            'miss_rate_7d': round(miss_rate * 100, 1),
            'slot_streak': streak,
            'active_medicines': active_schedules,
            'consecutive_missed_days': consec_days,
            'has_dose_history': True,
        },
        'has_sufficient_data': True,
    }


def get_7d_predictions(patient_id: int) -> list:
    """
    Feature #49: Predicts upcoming doses in the next 7 days that are at risk.
    Only returns predictions if patient has sufficient historical dose data.
    
    Args:
        patient_id: The patient ID to get predictions for
        
    Returns:
        list: Predictions for the next 7 days, or empty if insufficient data
    """
    from apps.medicines.models import MedicineSchedule
    
    today = date.today()
    end_date = today + timedelta(days=7)
    
    schedules = MedicineSchedule.objects.filter(
        patient_id=patient_id, is_active=True
    ).select_related('medicine')
    
    # No predictions if no active medicine schedules
    if not schedules.exists():
        return []
    
    predictions = []
    
    # Calculate historical miss rates by medicine
    recent_doses = DoseLog.objects.filter(
        patient_id=patient_id, 
        scheduled_date__gte=today - timedelta(days=30)
    )
    
    # No sufficient data to make predictions
    if recent_doses.count() < 5:
        return []
    
    total_by_med = {}
    missed_by_med = {}
    
    for d in recent_doses:
        med_id = d.medicine_id
        total_by_med[med_id] = total_by_med.get(med_id, 0) + 1
        if d.status in ('missed', 'skipped'):
            missed_by_med[med_id] = missed_by_med.get(med_id, 0) + 1
            
    risk_info = calculate_risk_score(patient_id)
    base_risk = risk_info['score']
    
    current = today
    while current <= end_date:
        for schedule in schedules:
            if schedule.start_date <= current and (not schedule.end_date or current <= schedule.end_date):
                med_id = schedule.medicine_id
                med_miss_rate = missed_by_med.get(med_id, 0) / total_by_med.get(med_id, 1) if total_by_med.get(med_id, 0) > 0 else 0.0
                
                # Combine base patient risk and specific medicine miss rate
                prob = (0.4 * (base_risk / 100.0)) + (0.6 * med_miss_rate)
                
                if total_by_med.get(med_id, 0) == 0:
                    prob = base_risk / 100.0
                    
                risk_pct = min(round(prob * 100), 100)
                
                if risk_pct < 25:
                    dose_risk = 'low'
                elif risk_pct < 50:
                    dose_risk = 'medium'
                elif risk_pct < 75:
                    dose_risk = 'high'
                else:
                    dose_risk = 'critical'
                    
                predictions.append({
                    'date': current.isoformat(),
                    'day_name': current.strftime('%A'),
                    'medicine_name': schedule.medicine.name,
                    'dosage': schedule.medicine.dosage,
                    'scheduled_time': schedule.scheduled_time.strftime("%I:%M %p"),
                    'risk_percentage': risk_pct,
                    'risk_level': dose_risk,
                })
        current += timedelta(days=1)
        
    risk_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    predictions.sort(key=lambda x: (risk_order[x['risk_level']], x['date']))
    
    return predictions


def get_adherence_trend(patient_id: int) -> list:
    """
    Feature #50: Calculate weekly compliance rates for the last 4 weeks.
    Returns honest compliance data: actual percentage when doses exist,
    null when no doses were scheduled that week (genuine representation).
    
    Args:
        patient_id: The patient ID to get trends for
        
    Returns:
        list: Weekly compliance data with honest representations
    """
    today = date.today()
    trend = []
    
    total_doses_all_time = DoseLog.objects.filter(patient_id=patient_id).count()
    
    for w in range(4):
        start_date = today - timedelta(days=(4-w)*7)
        end_date = start_date + timedelta(days=6)
        
        doses = DoseLog.objects.filter(
            patient_id=patient_id,
            scheduled_date__gte=start_date,
            scheduled_date__lte=end_date
        )
        total = doses.count()
        taken = doses.filter(status='taken').count()
        
        # GENUINE representation: null when no doses scheduled that week
        if total == 0:
            compliance_rate = None  # No data available for this week
        else:
            compliance_rate = round((taken / total * 100), 1)
        
        trend.append({
            'week_label': f"Wk {w+1} ({start_date.strftime('%b %d')})",
            'compliance_rate': compliance_rate,
            'taken': taken,
            'total': total,
            'has_data': total > 0,  # Flag to indicate if data exists
        })
    
    return trend
