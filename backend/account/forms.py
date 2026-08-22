from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django import forms
from django.core.files.uploadedfile import UploadedFile

from common.images import ImageRejected, validate_image

from .models import CollaborationRequest, User


class SignupForm(UserCreationForm):
    """Django admin's "add user" form (`UserAdmin.add_form`) — an admin's own
    manual escape hatch, independent of the public collaboration flow."""

    class Meta:
        model = User
        fields = ('email', 'name', 'password1', 'password2')


class CollaborationRequestForm(forms.ModelForm):
    class Meta:
        model = CollaborationRequest
        fields = ('name', 'email', 'message')


class AdminUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = '__all__'


class ProfileForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ('email', 'name', 'avatar',)

    def clean_avatar(self):
        """Avatars go through the same hardening as report photos (TD-12).

        They are served publicly — `GET /api/reports/` nests the author's
        `avatarURL` — so an un-stripped one publishes the uploader's GPS.
        """
        avatar = self.cleaned_data.get('avatar')
        # Only a newly posted file needs work; an unchanged field arrives as the
        # stored FieldFile and must not be re-encoded on every profile save.
        if not isinstance(avatar, UploadedFile):
            return avatar
        try:
            return validate_image(avatar)
        except ImageRejected as exc:
            raise forms.ValidationError(str(exc)) from exc