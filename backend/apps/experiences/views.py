from rest_framework import generics, permissions
from django.db.models import Q
from apps.experiences.models import FoodExperience, Category, Location, TimeSlot
from apps.accounts.permissions import IsApprovedVendor
from apps.experiences.serializers import (
    PublicFoodExperienceSerializer,
    PublicFoodExperienceDetailSerializer,
    CategorySerializer,
    LocationSerializer,
    VendorFoodExperienceSerializer,
    VendorTimeSlotSerializer
)

class PublicExperiencesListView(generics.ListAPIView):
    """
    Public endpoint to browse, search and filter all published food experiences from approved vendors.
    No authentication required.
    Supported params: q, category, location, min_price, max_price
    """
    serializer_class = PublicFoodExperienceSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = FoodExperience.objects.filter(
            status='Published',
            vendor_profile__approval_status='Approved'
        )

        # 1. Search Query (q)
        q = self.request.query_params.get('q', None)
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q) | Q(description__icontains=q)
            )

        # 2. Category Filter (Must handle invalid integer values safely)
        category_param = self.request.query_params.get('category', None)
        if category_param:
            try:
                category_id = int(category_param)
                queryset = queryset.filter(category_id=category_id)
            except ValueError:
                # If invalid integer format, return empty query to prevent crash/unexpected results
                queryset = queryset.none()

        # 3. Location Filter (Must handle invalid integer values safely)
        location_param = self.request.query_params.get('location', None)
        if location_param:
            try:
                location_id = int(location_param)
                queryset = queryset.filter(location_id=location_id)
            except ValueError:
                # Handle gracefully
                queryset = queryset.none()

        # 4. Price Limits Filters (Must handle invalid decimal/float values safely)
        min_price_param = self.request.query_params.get('min_price', None)
        if min_price_param:
            try:
                min_price = float(min_price_param)
                queryset = queryset.filter(price_sgd__gte=min_price)
            except ValueError:
                queryset = queryset.none()

        max_price_param = self.request.query_params.get('max_price', None)
        if max_price_param:
            try:
                max_price = float(max_price_param)
                queryset = queryset.filter(price_sgd__lte=max_price)
            except ValueError:
                queryset = queryset.none()

        return queryset.order_by('-food_experience_id')

class PublicExperienceDetailView(generics.RetrieveAPIView):
    """
    Public endpoint to view individual food experience details.
    No authentication required. Only retrieves published experiences from approved vendors.
    """
    serializer_class = PublicFoodExperienceDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return FoodExperience.objects.filter(
            status='Published',
            vendor_profile__approval_status='Approved'
        )

class CategoryListView(generics.ListAPIView):
    """
    Public read-only listing of active categories to support search dropdown options.
    """
    queryset = Category.objects.filter(is_active=True).order_by('category_name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

class LocationListView(generics.ListAPIView):
    """
    Public read-only listing of locations to support search dropdown options.
    """
    queryset = Location.objects.all().order_by('address')
    serializer_class = LocationSerializer
    permission_classes = [permissions.AllowAny]

class VendorExperienceListView(generics.ListCreateAPIView):
    """
    List and create experiences for the authenticated approved vendor.
    """
    serializer_class = VendorFoodExperienceSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def get_queryset(self):
        return FoodExperience.objects.filter(
            vendor_profile=self.request.user.vendor_profile
        ).order_by('-food_experience_id')

    def perform_create(self, serializer):
        serializer.save(vendor_profile=self.request.user.vendor_profile)

class VendorExperienceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or soft-delete (mark Inactive) an experience owned by the vendor.
    """
    serializer_class = VendorFoodExperienceSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def get_queryset(self):
        return FoodExperience.objects.filter(
            vendor_profile=self.request.user.vendor_profile
        )

    def perform_destroy(self, instance):
        # Soft delete: change status to 'Inactive' instead of hard deleting (Rule 10)
        instance.status = 'Inactive'
        instance.save()

class VendorTimeSlotCreateView(generics.CreateAPIView):
    """
    Create a new timeslot for an experience owned by the vendor.
    """
    serializer_class = VendorTimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

class VendorTimeSlotDestroyView(generics.DestroyAPIView):
    """
    Delete a timeslot. The timeslot must belong to an experience owned by the vendor.
    """
    serializer_class = VendorTimeSlotSerializer
    permission_classes = [permissions.IsAuthenticated, IsApprovedVendor]

    def get_queryset(self):
        return TimeSlot.objects.filter(
            food_experience__vendor_profile=self.request.user.vendor_profile
        )


import urllib.request
import json
import os
import logging
import re
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.experiences.serializers import PublicFoodExperienceSerializer

logger = logging.getLogger(__name__)

class AIRecommendationsView(APIView):
    """
    Optional AI Recommendation Assistant View (Control 11 and 12).
    Generates tailored experience lists using Gemini API from user preference keywords.
    """
    permission_classes = [permissions.AllowAny]

    FALLBACK_STOPWORDS = {
        'a', 'an', 'and', 'eat', 'experience', 'food', 'for', 'i', 'in',
        'local', 'looking', 'me', 'my', 'of', 'on', 'please', 'singapore',
        'some', 'the', 'to', 'try', 'want', 'with',
    }

    @staticmethod
    def _normalize_search_text(value):
        return ' '.join(re.findall(r'[a-z0-9]+', str(value or '').lower()))

    @classmethod
    def _fallback_score(cls, experience, normalized_query, keywords):
        title = cls._normalize_search_text(experience.title)
        description = cls._normalize_search_text(experience.description)
        category = cls._normalize_search_text(
            experience.category.category_name if experience.category else ''
        )
        location = cls._normalize_search_text(
            experience.location.address if experience.location else ''
        )
        vendor = cls._normalize_search_text(
            experience.vendor_profile.business_name if experience.vendor_profile else ''
        )
        title_words = set(title.split())
        searchable_words = set(
            f'{title} {description} {category} {location} {vendor}'.split()
        )
        matched_keyword_count = sum(keyword in searchable_words for keyword in keywords)
        if len(keywords) > 1 and matched_keyword_count < 2:
            return 0
        meaningful_phrase = ' '.join(keywords)
        score = 0

        if normalized_query and normalized_query in title:
            score += 180
        if len(keywords) > 1 and meaningful_phrase in title:
            score += 140
        score += 30 * sum(keyword in title_words for keyword in keywords)

        weighted_fields = (
            (description, 45, 8),
            (category, 35, 7),
            (location, 25, 5),
            (vendor, 20, 4),
        )
        for field, phrase_weight, keyword_weight in weighted_fields:
            field_words = set(field.split())
            if len(keywords) > 1 and meaningful_phrase in field:
                score += phrase_weight
            score += keyword_weight * sum(keyword in field_words for keyword in keywords)
        return score

    @classmethod
    def _query_aware_fallback(cls, public_experiences, query):
        normalized_query = cls._normalize_search_text(query)
        keywords = [
            word for word in normalized_query.split()
            if word not in cls.FALLBACK_STOPWORDS and len(word) > 1
        ]
        experiences = list(public_experiences.select_related('category', 'location', 'vendor_profile'))
        ranked = sorted(
            (
                (cls._fallback_score(experience, normalized_query, keywords), experience)
                for experience in experiences
            ),
            key=lambda item: (-item[0], -item[1].food_experience_id),
        )
        matches = [experience for score, experience in ranked if score > 0][:3]
        if matches:
            return matches, True
        return sorted(experiences, key=lambda item: item.food_experience_id, reverse=True)[:3], False

    def post(self, request, *args, **kwargs):
        query = request.data.get('query', '').strip()
        if not query:
            return Response(
                {"detail": "craving query is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Sanitize input preference text
        sanitized_query = query.replace('\r', ' ').replace('\n', ' ')[:200]

        # Fetch only public approved listings
        public_experiences = FoodExperience.objects.filter(
            status='Published',
            vendor_profile__approval_status='Approved'
        )

        # Deterministic, query-aware fallback over public records only.
        fallback_experiences, fallback_matched_query = self._query_aware_fallback(
            public_experiences,
            sanitized_query,
        )
        fallback_serializer = PublicFoodExperienceSerializer(fallback_experiences, many=True)

        def make_fallback_response(explanation_text=None):
            if explanation_text is None:
                if fallback_matched_query:
                    explanation_text = (
                        f'Live AI is unavailable, so these public catalogue matches were ranked '
                        f'for “{sanitized_query}”.'
                    )
                else:
                    explanation_text = (
                        'Live AI is unavailable and no direct catalogue match was found. '
                        'Here are some popular public experiences instead.'
                    )
            return Response({
                "explanation": explanation_text,
                "recommendations": fallback_serializer.data,
                "is_fallback": True
            }, status=status.HTTP_200_OK)

        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("Missing GEMINI_API_KEY configuration.")
            return make_fallback_response()

        # Exclude draft/inactive/pending vendor listings from context
        experiences_context = []
        for exp in public_experiences:
            experiences_context.append({
                "id": exp.food_experience_id,
                "title": exp.title,
                "category": exp.category.category_name if exp.category else "",
                "location": exp.location.address if exp.location else "",
                "price": float(exp.price_sgd)
            })

        if not experiences_context:
            return make_fallback_response("No available experiences found.")

        # API endpoint config
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

        prompt = f"""
        You are an AI Food Recommendation Assistant for TasteLocal SG.
        The user is looking for food experiences in Singapore matching the preference query: "{sanitized_query}".
        Here is a list of available approved food experiences:
        {json.dumps(experiences_context)}

        Provide a JSON response containing:
        1. "recommended_ids": list of integers representing matching experience IDs from the provided list, sorted by relevance. Return at most 5 matches.
        2. "explanation": a concise paragraph explaining why these recommendations match the user's preference query.

        JSON response format:
        {{
          "recommended_ids": [...],
          "explanation": "..."
        }}
        """

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)

                candidates = res_json.get('candidates', [])
                if not candidates:
                    raise ValueError("No candidates returned from Gemini")

                content_parts = candidates[0].get('content', {}).get('parts', [])
                if not content_parts:
                    raise ValueError("No content parts returned")

                ai_text = content_parts[0].get('text', '').strip()
                ai_data = json.loads(ai_text)

                recommended_ids = ai_data.get('recommended_ids', [])
                explanation = ai_data.get('explanation', '').strip()

                if not isinstance(recommended_ids, list):
                    raise ValueError("recommended_ids format is not a list")

                valid_ids = []
                for rid in recommended_ids:
                    try:
                        parsed_id = int(rid)
                        if parsed_id not in valid_ids:
                            valid_ids.append(parsed_id)
                    except (ValueError, TypeError):
                        continue

                matched_exps = public_experiences.filter(food_experience_id__in=valid_ids)
                id_map = {e.food_experience_id: e for e in matched_exps}
                ordered_exps = [id_map[rid] for rid in valid_ids if rid in id_map]

                if not ordered_exps:
                    return make_fallback_response()

                serializer = PublicFoodExperienceSerializer(ordered_exps, many=True)
                return Response({
                    "explanation": explanation or "Here are your recommended food experiences:",
                    "recommendations": serializer.data,
                    "is_fallback": False
                }, status=status.HTTP_200_OK)

        except Exception as exc:
            logger.error("Gemini API request failed (%s).", exc.__class__.__name__)
            return make_fallback_response()
