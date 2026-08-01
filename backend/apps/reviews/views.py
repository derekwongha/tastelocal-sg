from rest_framework import generics, permissions, status
from rest_framework.response import Response
from apps.accounts.permissions import IsTourist
from apps.reviews.serializers import ReviewCreateSerializer, ReviewReadSerializer

class ReviewCreateView(generics.CreateAPIView):
    """
    Allows authenticated tourists to submit reviews for completed booking experiences (FR-008).
    """
    permission_classes = [permissions.IsAuthenticated, IsTourist]
    serializer_class = ReviewCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        read_serializer = ReviewReadSerializer(review)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
