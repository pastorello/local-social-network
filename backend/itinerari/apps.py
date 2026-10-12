from django.apps import AppConfig


class ItinerariConfig(AppConfig):
    name = 'itinerari'
    verbose_name = 'itinerari'

    def ready(self):
        # I4 on the generic card form too, where a tour's `is_published` is
        # edited in Django admin (TD-49; see content/publishing.py).
        from content.publishing import register_publish_check

        from .rules import tour_publish_problem

        register_publish_check(tour_publish_problem)
