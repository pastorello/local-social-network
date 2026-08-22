from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from account.forms import AdminUserChangeForm, SignupForm
from account.models import AccountToken, CollaborationRequest, User
from account.services import send_invite_email


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = AdminUserChangeForm
    add_form = SignupForm

    ordering = ('email',)
    list_display = ('email', 'name', 'role', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('email', 'name')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('name', 'avatar')}),
        (
            'Permissions',
            {
                'fields': (
                    'role',
                    'is_steering',
                    'is_active',
                    'is_staff',
                    'is_superuser',
                    'groups',
                    'user_permissions',
                )
            },
        ),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'name', 'password1', 'password2')}),
    )


@admin.register(CollaborationRequest)
class CollaborationRequestAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status',)
    search_fields = ('name', 'email')
    readonly_fields = ('created_at', 'reviewed_at', 'reviewed_by')
    actions = ('approve_requests', 'reject_requests')

    @admin.action(description='Approva le richieste selezionate')
    def approve_requests(self, request, queryset):
        approved = 0
        for collab_request in queryset:
            if collab_request.status != CollaborationRequest.PENDING:
                self.message_user(
                    request, f'{collab_request.email}: non è più in attesa, saltata.'
                )
                continue
            if User.objects.filter(email=collab_request.email).exists():
                self.message_user(
                    request, f'{collab_request.email}: esiste già un account, saltata.'
                )
                continue

            user = User(email=collab_request.email, name=collab_request.name, role=User.CITIZEN)
            user.set_unusable_password()
            user.save()

            _token, raw_token = AccountToken.create_for(user, AccountToken.INVITE)
            send_invite_email(user, raw_token)

            collab_request.status = CollaborationRequest.APPROVED
            collab_request.reviewed_at = timezone.now()
            collab_request.reviewed_by = request.user
            collab_request.save(update_fields=('status', 'reviewed_at', 'reviewed_by'))
            approved += 1

        if approved:
            self.message_user(request, f'{approved} richieste approvate e invito inviato.')

    @admin.action(description='Rifiuta le richieste selezionate')
    def reject_requests(self, request, queryset):
        updated = queryset.filter(status=CollaborationRequest.PENDING).update(
            status=CollaborationRequest.REJECTED,
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(request, f'{updated} richieste rifiutate.')
