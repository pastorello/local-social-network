"""One pagination policy for every list endpoint (TD-25).

`page_size_query_param` without `max_page_size` is the classic way to hand a
caller an unbounded response; the cap is the point of this class existing.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
