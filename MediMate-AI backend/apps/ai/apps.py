from django.apps import AppConfig
from django.db.models.signals import post_migrate
import os
import sys
import logging

logger = logging.getLogger(__name__)


class AiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai'
    verbose_name = 'AI Engine'

    def ready(self):
        """
        Production-ready app initialization that defers database access.
        Uses a deferred background thread or post_migrate signal to start the scheduler.
        """
        # Only start scheduler in appropriate contexts
        # Skip: manage.py commands, test runs, migrations
        if 'migrate' in sys.argv or 'makemigrations' in sys.argv:
            logger.debug("Skipping scheduler start during migrations")
            return
        
        # Register the post_migrate signal to start scheduler after migrations (fallback/production)
        post_migrate.connect(self._start_scheduler, sender=self)

        # In development (runserver) or production ASGI/WSGI (where manage.py is not in argv):
        # start the scheduler in a deferred background thread to bypass Django's main-thread startup check
        if 'runserver' in sys.argv:
            if os.environ.get('RUN_MAIN') == 'true':
                import threading
                threading.Thread(target=self._start_scheduler_deferred, daemon=True).start()
        elif 'manage.py' not in sys.argv:
            import threading
            threading.Thread(target=self._start_scheduler_deferred, daemon=True).start()

    @classmethod
    def _start_scheduler_deferred(cls):
        """Sleep for a short duration to let Django finish initialization before invoking the scheduler."""
        import time
        time.sleep(1.0)
        cls._start_scheduler(sender=None)
    
    @staticmethod
    def _start_scheduler(sender, **kwargs):
        """
        Called after migrations complete (post_migrate signal).
        Safely starts the scheduler without database access issues.
        """
        try:
            # Only start in appropriate environments
            if 'runserver' in sys.argv:
                # In runserver: only start in reloader child process to avoid duplicates
                if os.environ.get('RUN_MAIN') != 'true':
                    logger.debug("Deferring scheduler start (main process)")
                    return
                logger.info("Starting scheduler in reloader child process")
            elif 'manage.py' in sys.argv or 'test' in sys.argv:
                # Don't start scheduler during test runs or other manage.py commands
                logger.debug("Skipping scheduler start in management context")
                return
            # Production (Gunicorn/WSGI): start scheduler
            
            from scheduler.jobs import start_scheduler, get_scheduler
            
            # Check if already running
            if get_scheduler() is not None:
                logger.debug("Scheduler already running, skipping restart")
                return
            
            start_scheduler()
            logger.info("Scheduler initialization complete")
            
        except Exception as e:
            logger.error(
                f"Failed to initialize scheduler: {e}. "
                "Background tasks will not run until restart.",
                exc_info=True
            )

