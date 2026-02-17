# core/authentication.py
from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # Grab the token from the cookie, NOT the Authorization header
        raw_token = request.COOKIES.get('access_token')  # <- Make sure this matches the cookie name set in LoginView

        if raw_token is None:
            return None  # No token? DRF moves on to the next auth class or fails

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
