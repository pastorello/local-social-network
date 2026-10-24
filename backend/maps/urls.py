from django.urls import path

from . import api

urlpatterns = [
    path('features/', api.map_features, name='map_features'),
    path('overlays/', api.overlay_list, name='overlay_list'),
    path('zone/', api.zone_list, name='zone_list'),
    path('zone/alias/', api.zone_alias_list, name='zone_alias_list'),
]
