"""Repair the denormalized upvote counter (TD-19).

`IssueReport.upvotes_count` is denormalized, and `reports/admin.py` marks it
read-only — so when it drifts, nothing in the product can put it right. This is
that something. Safe to run at any time: it recomputes from the `Upvote` rows,
which are the source of truth.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count

from reports.models import IssueReport


class Command(BaseCommand):
    help = 'Recompute IssueReport.upvotes_count from the Upvote rows.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report what would change without writing.',
        )

    def handle(self, *args, **options):
        drifted = [
            report
            for report in IssueReport.objects.annotate(real=Count('upvotes'))
            if report.upvotes_count != report.real
        ]

        for report in drifted:
            self.stdout.write(f'{report.id}  {report.upvotes_count} -> {report.real}')

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'{len(drifted)} would be corrected (dry run)'))
            return

        for report in drifted:
            IssueReport.objects.filter(pk=report.pk).update(upvotes_count=report.real)

        self.stdout.write(self.style.SUCCESS(f'{len(drifted)} corrected'))
