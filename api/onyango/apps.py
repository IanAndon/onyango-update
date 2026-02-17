from django.apps import AppConfig


class OnyangoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'onyango'
    verbose_name = 'Onyango Hardware'

    def ready(self):
        pass
