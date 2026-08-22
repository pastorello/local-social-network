"""E-mail sending for the account flows (spec A3 invite, A4 password reset).

Plain functions, not a class or a queue — two call sites (the admin approve
action, and the password-reset request view) share this instead of each
hand-rolling `send_mail`.
"""

from django.conf import settings
from django.core.mail import send_mail


def send_invite_email(user, raw_token):
    link = f'{settings.FRONTEND_URL}/invito/{raw_token}'
    send_mail(
        subject='Sei stato invitato a collaborare con Vivere Gaeta',
        message=(
            f'Ciao {user.name},\n\n'
            'La tua richiesta di collaborazione è stata approvata. '
            f'Imposta la tua password per attivare l\'account:\n\n{link}\n\n'
            'Il link scade tra 7 giorni.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


def send_password_reset_email(user, raw_token):
    link = f'{settings.FRONTEND_URL}/reimposta-password/{raw_token}'
    send_mail(
        subject='Reimposta la tua password — Vivere Gaeta',
        message=(
            f'Ciao {user.name},\n\n'
            f'Per reimpostare la tua password, apri questo link:\n\n{link}\n\n'
            'Il link scade tra un\'ora. Se non hai richiesto tu il reset, ignora questa e-mail.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
