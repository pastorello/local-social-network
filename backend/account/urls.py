from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import api
from .throttling import LoginRateThrottle


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """SimpleJWT's view, rate limited (TD-18)."""

    throttle_classes = [LoginRateThrottle]

urlpatterns = [
    path('me/', api.me, name='me'),
    path('collaborate/', api.collaborate, name='collaborate'),
    path('acceptinvite/', api.acceptinvite, name='acceptinvite'),
    path('requestpasswordreset/', api.requestpasswordreset, name='requestpasswordreset'),
    path('confirmpasswordreset/', api.confirmpasswordreset, name='confirmpasswordreset'),
    path('login/', ThrottledTokenObtainPairView.as_view(), name='token_obtain'),
    path('logout/', api.logout, name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('editprofile/', api.editprofile, name='editprofile'),
    path('editpassword/', api.editpassword, name='editpassword'),
    path('<uuid:pk>/', api.user, name='user'),
    path('list/', api.user_list, name='user_list'),
]