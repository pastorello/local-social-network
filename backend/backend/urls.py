from django.conf.urls.static import static
from django.conf import settings
from django.urls import path, include
from django.contrib import admin

from account.views import activateemail

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('account.urls')),
    path('activateemail/', activateemail, name='activateemail'),
]  + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
