import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Clock,
  FileText,
  Navigation,
  Search,
  AlertCircle,
  Map,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { createClient } from '@supabase/supabase-js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Initialize Supabase client
const supabase = createClient(
  'YOUR_SUPABASE_URL', // You'll get this from Supabase
  'YOUR_SUPABASE_ANON_KEY' // You'll get this from Supabase
);

// Map component that updates view
function ChangeMapView({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 16);
    }
  }, [coords, map]);
  return null;
}

export default function PollingFinder() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([47.4979, 19.0402]); // Budapest center
  const [showMap, setShowMap] = useState(false);

  // Search function using Supabase
  const searchPollingStation = async (searchAddress) => {
    setLoading(true);
    setError(null);

    try {
      const searchLower = searchAddress.toLowerCase();

      // First try postal code search
      const postalMatch = searchAddress.match(/\b\d{4}\b/);
      if (postalMatch) {
        const { data, error } = await supabase
          .from('polling_stations')
          .select('*')
          .eq('postal_code', postalMatch[0])
          .limit(1)
          .single();

        if (data) {
          setResult(data);
          setMapCenter([data.lat, data.lng]);
          setShowMap(true);
          setLoading(false);
          return;
        }
      }

      // Try settlement search
      const { data: settlementData } = await supabase
        .from('polling_stations')
        .select('*')
        .ilike('settlement', `%${searchLower}%`)
        .limit(1);

      if (settlementData && settlementData.length > 0) {
        setResult(settlementData[0]);
        setMapCenter([settlementData[0].lat, settlementData[0].lng]);
        setShowMap(true);
        setLoading(false);
        return;
      }

      // Try address search
      const { data: addressData } = await supabase
        .from('polling_stations')
        .select('*')
        .ilike('address', `%${searchLower}%`)
        .limit(1);

      if (addressData && addressData.length > 0) {
        setResult(addressData[0]);
        setMapCenter([addressData[0].lat, addressData[0].lng]);
        setShowMap(true);
      } else {
        setError('Nem találtuk a címedhez tartozó szavazókört');
        setResult(null);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Hiba történt a keresés során');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchPollingStation(address);
  };

  // Custom marker icon
  const customIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-900 mb-2">Hol szavazhatok?</h1>
          <p className="text-lg text-gray-700">
            Találd meg a szavazókörödet gyorsan és egyszerűen
          </p>
          <div className="mt-4 inline-block bg-indigo-600 text-white px-4 py-1 rounded-full text-sm">
            Tisza Párt támogatói eszköz
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Search and Results */}
          <div className="space-y-4">
            {/* Search Form */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add meg a lakcímedet
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="pl. 1052 Budapest, Petőfi utca 10."
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      required
                    />
                    <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Tipp: Add meg az irányítószámot vagy a város nevét
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Keresés...' : 'Szavazóköröm keresése'}
                </button>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl shadow-xl p-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-red-900 mb-1">Hiba</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Location Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-indigo-100 p-3 rounded-lg">
                      <MapPin className="text-indigo-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        A te szavazóköröd
                      </h3>
                      <p className="text-gray-700 font-medium">{result.address}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {result.district || result.settlement}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Azonosító: {result.station_number}
                      </p>
                      <button
                        onClick={() => {
                          const coords = `${result.lat},${result.lng}`;
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${coords}`,
                            '_blank'
                          );
                        }}
                        className="inline-flex items-center mt-3 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                      >
                        <Navigation size={16} className="mr-1" />
                        Útvonal Google Maps-en
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hours Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <Clock className="text-green-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        Nyitvatartás
                      </h3>
                      <p className="text-gray-700 font-medium">6:00 - 19:00</p>
                      <p className="text-sm text-gray-500 mt-1">
                        2026. április (választás napján)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requirements Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-amber-100 p-3 rounded-lg">
                      <FileText className="text-amber-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">
                        Amit magaddal kell vinned
                      </h3>
                      <ul className="space-y-2">
                        <li className="flex items-center text-gray-700">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
                          Személyi igazolvány vagy útlevél
                        </li>
                        <li className="flex items-center text-gray-700">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></span>
                          Lakcímkártya
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Map */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-xl p-4 h-[600px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Map className="mr-2 text-indigo-600" size={20} />
                  Térkép
                </h3>
                {!showMap && (
                  <p className="text-sm text-gray-500">
                    Keress rá egy címre a térkép megjelenítéséhez
                  </p>
                )}
              </div>

              <div className="h-[540px] rounded-lg overflow-hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={showMap ? 16 : 7}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ChangeMapView
                    coords={showMap && result ? [result.lat, result.lng] : null}
                  />

                  {result && result.lat && result.lng && (
                    <Marker position={[result.lat, result.lng]} icon={customIcon}>
                      <Popup>
                        <div className="p-2">
                          <p className="font-semibold">{result.address}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Szavazókör: {result.station_number}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {result && (
          <div className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl shadow-xl p-6 text-white text-center">
            <h3 className="font-bold text-xl mb-2">Minden szavazat számít!</h3>
            <p className="text-indigo-100 mb-4">
              Oszd meg ezt az eszközt barátaiddal és családoddal
            </p>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Hol szavazhatok?',
                    text: 'Találd meg a szavazókörödet!',
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link másolva!');
                }
              }}
              className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Megosztás
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
