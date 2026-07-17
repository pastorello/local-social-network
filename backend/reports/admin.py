from django.contrib import admin

from reports.models import Category, IssueReport, Upvote


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'is_active')
    list_editable = ('color', 'is_active')
    search_fields = ('name',)


@admin.register(IssueReport)
class IssueReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'status', 'author', 'upvotes_count', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('title', 'description')
    readonly_fields = ('upvotes_count', 'created_at', 'updated_at')


@admin.register(Upvote)
class UpvoteAdmin(admin.ModelAdmin):
    list_display = ('report', 'user', 'created_at')
