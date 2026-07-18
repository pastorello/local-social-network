from django.contrib import admin

from polls.models import Poll, PollOption, Vote


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ('question', 'created_by', 'is_closed', 'closes_at', 'created_at')
    list_filter = ('is_closed',)
    search_fields = ('question',)
    inlines = [PollOptionInline]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('poll', 'option', 'user', 'created_at')
