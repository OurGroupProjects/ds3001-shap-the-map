import googlemaps
import json
from pprint import pprint

# API key should be loaded from your secrets.json file
PLACES_API_KEY: ''

# Load the api key from secrets.json
with open('secrets.json') as secrets:
    data = json.load(secrets)
    PLACES_API_KEY = data['api_keys']['google_places']

gmaps = googlemaps.Client(key=PLACES_API_KEY)

response = gmaps.places(query='restaurant worcester mass')

