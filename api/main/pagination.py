from rest_framework.pagination import PageNumberPagination

class OrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'  # client can override if needed
    max_page_size = 100

class ProductPagination(PageNumberPagination):
    page_size = 50  # tweak this for scroll performance
    page_size_query_param = 'page_size'
    max_page_size = 100