/**
 * Maritime Sea Routing and AIS Navigation Engine
 * Computes realistic oceanic sea corridors, waypoints, nautical distances,
 * vessel heading (COG), and interpolated positions across global shipping lanes.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MaritimeWaypoint {
  id: string;
  name: string;
  code?: string;
  type: 'port_origin' | 'port_destination' | 'canal' | 'strait' | 'sea_lane';
  lat: number;
  lng: number;
  description?: string;
  passed?: boolean;
  active?: boolean;
  eta?: string;
}

export interface VesselAISTelemetry {
  vesselName: string;
  voyageNumber?: string;
  imoNumber: string;
  mmsi: string;
  flag: {
    country: string;
    code: string;
    emoji: string;
  };
  vesselType: string;
  lengthMeters: number;
  beamMeters: number;
  draughtMeters: number;
  currentPosition: GeoPoint;
  headingDegrees: number; // 0 to 360
  speedKnots: number;
  navigationalStatus: string;
  aisStation: string;
  lastSignalTime: string;
  weather: {
    seaState: string;
    waveHeightMeters: number;
    windSpeedKnots: number;
    windDirection: string;
    waterTempC: number;
  };
}

export interface SeaRouteAnalysis {
  originPort: string;
  destinationPort: string;
  originCoords: GeoPoint;
  destCoords: GeoPoint;
  waypoints: MaritimeWaypoint[];
  denseRouteCoordinates: [number, number][]; // [lat, lng][] for Leaflet
  totalDistanceNM: number;
  totalDistanceKM: number;
  distanceCoveredNM: number;
  distanceRemainingNM: number;
  progressPct: number;
  vesselCurrentPos: GeoPoint;
  vesselHeading: number;
  vesselSpeedKnots: number;
  etaDays: number;
  etaHours: number;
  etaDate: Date;
  activeWaypointIndex: number;
  currentZoneName: string;
  /** ETA confidence score 0-100 based on route complexity and remaining distance */
  etaConfidenceScore: number;
  /** Whether this route uses the Cape of Good Hope (alternate to Suez) */
  usesCapeRoute: boolean;
  /** Geofence: whether vessel is within arrival radius of destination */
  isAtDestination: boolean;
  /** Distance from vessel to destination in NM */
  distanceToDestNM: number;
}

// Global Maritime Choke-Points & Corridors
export const MARITIME_CHOKEPOINTS: Record<string, GeoPoint & { name: string; type: MaritimeWaypoint['type']; description: string }> = {
  // Transatlantic & European Corridors
  US_EAST_OFFSHORE: { name: 'US East Coast Sea Lane', type: 'sea_lane', lat: 39.5, lng: -71.5, description: 'Western Atlantic outbound traffic separation' },
  GULF_FLORIDA_STRAIT: { name: 'Florida Straits', type: 'strait', lat: 24.5, lng: -81.0, description: 'Gulf of Mexico to Atlantic sea passage' },
  NORTH_ATLANTIC_WAYPOINT: { name: 'North Atlantic Ocean Corridor', type: 'sea_lane', lat: 37.0, lng: -35.0, description: 'Deep ocean mid-Atlantic great circle lane' },
  GIBRALTAR_ENTRANCE: { name: 'Strait of Gibraltar', type: 'strait', lat: 35.95, lng: -5.60, description: 'Atlantic - Mediterranean maritime gateway' },
  
  // Mediterranean Corridor
  MED_WEST: { name: 'Alboran Sea Corridor', type: 'sea_lane', lat: 36.8, lng: -1.5, description: 'Western Mediterranean deepwater lane' },
  MED_SICILY_STRAIT: { name: 'Strait of Sicily', type: 'strait', lat: 37.0, lng: 11.5, description: 'Central Mediterranean transit strait' },
  MED_EAST_CRETEROUTE: { name: 'South Crete Corridor', type: 'sea_lane', lat: 34.2, lng: 25.0, description: 'Eastern Mediterranean shipping corridor' },
  MERSIN_APPROACH: { name: 'Gulf of Iskenderun', type: 'sea_lane', lat: 36.4, lng: 35.2, description: 'Northeastern Mediterranean port approach' },

  // Suez & Red Sea Corridor
  SUEZ_NORTH_PORT_SAID: { name: 'Port Said (Suez North)', type: 'canal', lat: 31.26, lng: 32.31, description: 'Northern entrance to the Suez Canal' },
  SUEZ_SOUTH: { name: 'Suez Port (Canal South)', type: 'canal', lat: 29.97, lng: 32.56, description: 'Southern terminus into Gulf of Suez' },
  RED_SEA_CENTRAL: { name: 'Red Sea Deepwater Route', type: 'sea_lane', lat: 21.0, lng: 38.0, description: 'Central Red Sea traffic fairway' },
  BAB_EL_MANDEB: { name: 'Bab-el-Mandeb Strait', type: 'strait', lat: 12.58, lng: 43.33, description: 'Red Sea to Gulf of Aden strategic choke-point' },
  GULF_OF_ADEN: { name: 'Gulf of Aden Transit Corridor', type: 'sea_lane', lat: 12.3, lng: 48.0, description: 'Internationally Recommended Transit Corridor (IRTC)' },

  // Arabian Sea & Persian Gulf
  ARABIAN_SEA_WEST: { name: 'Western Arabian Sea', type: 'sea_lane', lat: 17.5, lng: 56.5, description: 'Arabian Sea deepwater route' },
  GULF_OF_OMAN: { name: 'Gulf of Oman Approach', type: 'sea_lane', lat: 24.5, lng: 58.8, description: 'Omani deepwater corridor to the Gulf' },
  STRAIT_OF_HORMUZ: { name: 'Strait of Hormuz', type: 'strait', lat: 26.56, lng: 56.25, description: 'Primary gateway to Arabian / Persian Gulf' },
  ARABIAN_GULF_SOUTH: { name: 'Southern Gulf Sea Lane', type: 'sea_lane', lat: 25.4, lng: 54.8, description: 'Approach to UAE deepwater container terminals' },

  // Alternate South Africa Route (Cape of Good Hope)
  CAPE_VERDE_OFFSHORE: { name: 'Cape Verde Sea Lane', type: 'sea_lane', lat: 15.0, lng: -24.0, description: 'Atlantic equatorial route' },
  CAPE_OF_GOOD_HOPE: { name: 'Cape of Good Hope', type: 'strait', lat: -34.8, lng: 19.5, description: 'Southern Africa oceanic cape route' },
  MOZAMBIQUE_CHANNEL: { name: 'Mozambique Channel', type: 'sea_lane', lat: -18.0, lng: 41.0, description: 'Indian Ocean northbound corridor' },
  
  // Asia Corridors
  MALACCA_STRAIT: { name: 'Strait of Malacca (Singapore)', type: 'strait', lat: 1.25, lng: 103.80, description: 'Major East Asia shipping artery' },
};

// Known Port Geo-Registry with Standard UN/LOCODEs
export const PORT_GEO_REGISTRY: Record<string, GeoPoint & { name: string; locode: string; country: string }> = {
  // ── USA ──
  'newark': { name: 'Port of New York & New Jersey', locode: 'USNWK', country: 'United States', lat: 40.6895, lng: -74.1745 },
  'new york': { name: 'Port of New York', locode: 'USNYC', country: 'United States', lat: 40.6848, lng: -74.0088 },
  'savannah': { name: 'Port of Savannah', locode: 'USSAV', country: 'United States', lat: 32.0809, lng: -81.0912 },
  'norfolk': { name: 'Port of Virginia (Norfolk)', locode: 'USORF', country: 'United States', lat: 36.8508, lng: -76.2859 },
  'baltimore': { name: 'Port of Baltimore', locode: 'USBAL', country: 'United States', lat: 39.2904, lng: -76.6122 },
  'charleston': { name: 'Port of Charleston', locode: 'USCHS', country: 'United States', lat: 32.7765, lng: -79.9311 },
  'houston': { name: 'Port of Houston', locode: 'USHOU', country: 'United States', lat: 29.7604, lng: -95.3698 },
  'los angeles': { name: 'Port of Los Angeles', locode: 'USLAX', country: 'United States', lat: 33.7288, lng: -118.2620 },
  'long beach': { name: 'Port of Long Beach', locode: 'USLGB', country: 'United States', lat: 33.7701, lng: -118.1937 },
  'oakland': { name: 'Port of Oakland', locode: 'USOAK', country: 'United States', lat: 37.7950, lng: -122.2780 },
  'seattle': { name: 'Port of Seattle', locode: 'USSEA', country: 'United States', lat: 47.6062, lng: -122.3321 },
  'tacoma': { name: 'Port of Tacoma', locode: 'USTIW', country: 'United States', lat: 47.2670, lng: -122.4420 },
  'miami': { name: 'Port of Miami', locode: 'USMIA', country: 'United States', lat: 25.7741, lng: -80.1703 },
  'jacksonville': { name: 'Port of Jacksonville', locode: 'USJAX', country: 'United States', lat: 30.3322, lng: -81.6557 },
  'philadelphia': { name: 'Port of Philadelphia', locode: 'USPHL', country: 'United States', lat: 39.9526, lng: -75.1652 },
  'wilmington': { name: 'Port of Wilmington', locode: 'USILM', country: 'United States', lat: 34.2257, lng: -77.9447 },
  'mobile': { name: 'Port of Mobile', locode: 'USMOB', country: 'United States', lat: 30.6944, lng: -88.0431 },
  'new orleans': { name: 'Port of New Orleans', locode: 'USMSY', country: 'United States', lat: 29.9511, lng: -90.0715 },

  // ── UAE & Gulf ──
  'jebel ali': { name: 'Port of Jebel Ali', locode: 'AEJEA', country: 'United Arab Emirates', lat: 24.9958, lng: 55.0667 },
  'dubai': { name: 'Port Rashid (Dubai)', locode: 'AEDXB', country: 'United Arab Emirates', lat: 25.2667, lng: 55.2833 },
  'abu dhabi': { name: 'Khalifa Port (Abu Dhabi)', locode: 'AEKHL', country: 'United Arab Emirates', lat: 24.7891, lng: 54.6789 },
  'sharjah': { name: 'Port Khalid (Sharjah)', locode: 'AESHJ', country: 'United Arab Emirates', lat: 25.3589, lng: 55.3789 },
  'khorfakkan': { name: 'Khor Fakkan Container Terminal', locode: 'AEKLF', country: 'United Arab Emirates', lat: 25.3600, lng: 56.3600 },
  'dammam': { name: 'King Abdul Aziz Port (Dammam)', locode: 'SADMN', country: 'Saudi Arabia', lat: 26.4333, lng: 50.1167 },
  'salalah': { name: 'Port of Salalah', locode: 'OMSLL', country: 'Oman', lat: 16.9455, lng: 54.0063 },
  'sohar': { name: 'Port of Sohar', locode: 'OMSOH', country: 'Oman', lat: 24.4986, lng: 56.6267 },
  'kuwait': { name: 'Shuwaikh Port (Kuwait City)', locode: 'KWSWK', country: 'Kuwait', lat: 29.3697, lng: 47.9783 },
  'doha': { name: 'Hamad Port (Doha)', locode: 'QAHAM', country: 'Qatar', lat: 24.8333, lng: 51.5333 },
  'manama': { name: 'Khalifa bin Salman Port', locode: 'BHKBS', country: 'Bahrain', lat: 26.2167, lng: 50.6000 },
  'bandar abbas': { name: 'Shahid Rajaee Port (Bandar Abbas)', locode: 'IRBND', country: 'Iran', lat: 27.1833, lng: 56.2667 },
  'bushire': { name: 'Port of Bushehr', locode: 'IRBUZ', country: 'Iran', lat: 28.9833, lng: 50.8333 },

  // ── Turkey & Mediterranean ──
  'mersin': { name: 'Mersin International Port', locode: 'TRMER', country: 'Turkey', lat: 36.7950, lng: 34.6400 },
  'istanbul': { name: 'Port of Ambarli (Istanbul)', locode: 'TRIST', country: 'Turkey', lat: 40.9700, lng: 28.6900 },
  'izmir': { name: 'Port of Izmir (Alsancak)', locode: 'TRIZM', country: 'Turkey', lat: 38.4389, lng: 27.1422 },
  'gebze': { name: 'Port of Gebze', locode: 'TRGEB', country: 'Turkey', lat: 40.8000, lng: 29.4333 },
  'aliaga': { name: 'Port of Aliaga', locode: 'TRALI', country: 'Turkey', lat: 38.7833, lng: 26.9667 },
  'iskenderun': { name: 'Port of Iskenderun', locode: 'TRISK', country: 'Turkey', lat: 36.5833, lng: 36.1667 },
  'piraeus': { name: 'Port of Piraeus', locode: 'GRPIR', country: 'Greece', lat: 37.9422, lng: 23.6367 },
  'thessaloniki': { name: 'Port of Thessaloniki', locode: 'GRSKG', country: 'Greece', lat: 40.6333, lng: 22.9333 },
  'valencia': { name: 'Port of Valencia', locode: 'ESVLC', country: 'Spain', lat: 39.4442, lng: -0.3242 },
  'algeciras': { name: 'Port of Algeciras', locode: 'ESALG', country: 'Spain', lat: 36.1408, lng: -5.4562 },
  'barcelona': { name: 'Port of Barcelona', locode: 'ESBCN', country: 'Spain', lat: 41.3458, lng: 2.1686 },
  'genoa': { name: 'Port of Genoa', locode: 'ITGOA', country: 'Italy', lat: 44.4056, lng: 8.9463 },
  'giola tauro': { name: 'Port of Gioia Tauro', locode: 'ITGIT', country: 'Italy', lat: 38.4333, lng: 15.9000 },
  'naples': { name: 'Port of Naples', locode: 'ITNAP', country: 'Italy', lat: 40.8383, lng: 14.2667 },
  'la spezia': { name: 'Port of La Spezia', locode: 'ITSPE', country: 'Italy', lat: 44.1083, lng: 9.8333 },
  'rotterdam': { name: 'Port of Rotterdam', locode: 'NLRTM', country: 'Netherlands', lat: 51.9566, lng: 4.1257 },
  'antwerp': { name: 'Port of Antwerp', locode: 'BEANR', country: 'Belgium', lat: 51.9502, lng: 4.2570 },
  'zeebrugge': { name: 'Port of Zeebrugge', locode: 'BEZEE', country: 'Belgium', lat: 51.3333, lng: 3.2000 },
  'hamburg': { name: 'Port of Hamburg', locode: 'DEHAM', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  'bremerhaven': { name: 'Port of Bremerhaven', locode: 'DEBRV', country: 'Germany', lat: 53.5500, lng: 8.5833 },
  'le havre': { name: 'Port of Le Havre', locode: 'FRLEH', country: 'France', lat: 49.4900, lng: 0.1072 },
  'marseille': { name: 'Port of Marseille', locode: 'FRMRS', country: 'France', lat: 43.2965, lng: 5.3698 },
  'fos': { name: 'Port of Fos-sur-Mer', locode: 'FRFOS', country: 'France', lat: 43.4333, lng: 4.8667 },
  'trieste': { name: 'Port of Trieste', locode: 'ITTRS', country: 'Italy', lat: 45.6500, lng: 13.7667 },
  'koper': { name: 'Port of Koper', locode: 'SIKOP', country: 'Slovenia', lat: 45.5500, lng: 13.7333 },
  'rijeka': { name: 'Port of Rijeka', locode: 'HRRJK', country: 'Croatia', lat: 45.3333, lng: 14.4333 },
  'constanta': { name: 'Port of Constanta', locode: 'ROCND', country: 'Romania', lat: 44.1667, lng: 28.6500 },
  'odessa': { name: 'Port of Odessa', locode: 'UAODS', country: 'Ukraine', lat: 46.4843, lng: 30.7326 },
  'limassol': { name: 'Port of Limassol', locode: 'CYLMS', country: 'Cyprus', lat: 34.6667, lng: 33.0333 },
  'haifa': { name: 'Port of Haifa', locode: 'ILHFA', country: 'Israel', lat: 32.8194, lng: 34.9992 },
  'ashdod': { name: 'Port of Ashdod', locode: 'ILASD', country: 'Israel', lat: 31.8333, lng: 34.6667 },
  'beirut': { name: 'Port of Beirut', locode: 'LBBEY', country: 'Lebanon', lat: 33.9000, lng: 35.5167 },
  'latakia': { name: 'Port of Latakia', locode: 'SYLTK', country: 'Syria', lat: 35.5167, lng: 35.7833 },
  'tripoli': { name: 'Port of Tripoli (Lebanon)', locode: 'LBKYE', country: 'Lebanon', lat: 34.4500, lng: 35.8333 },
  'damietta': { name: 'Port of Damietta', locode: 'EGDAM', country: 'Egypt', lat: 31.4167, lng: 31.8167 },
  'alexandria': { name: 'Port of Alexandria', locode: 'EGALY', country: 'Egypt', lat: 31.2000, lng: 29.9167 },
  'port said': { name: 'Port Said', locode: 'EGPSD', country: 'Egypt', lat: 31.2667, lng: 32.3000 },

  // ── South Asia ──
  'karachi': { name: 'Karachi Port', locode: 'PKKHI', country: 'Pakistan', lat: 24.8415, lng: 66.9748 },
  'port qasim': { name: 'Port Muhammad Bin Qasim', locode: 'PKBQM', country: 'Pakistan', lat: 24.7827, lng: 67.3436 },
  'nhava sheva': { name: 'Jawaharlal Nehru Port (Nhava Sheva)', locode: 'INNSA', country: 'India', lat: 18.9500, lng: 72.9500 },
  'mundra': { name: 'Port of Mundra', locode: 'INMUN', country: 'India', lat: 22.7500, lng: 69.7000 },
  'mumbai': { name: 'Mumbai Port Trust', locode: 'INBOM', country: 'India', lat: 18.9333, lng: 72.8333 },
  'chennai': { name: 'Chennai Port', locode: 'INMAA', country: 'India', lat: 13.0833, lng: 80.2833 },
  'colombo': { name: 'Port of Colombo', locode: 'LKCMB', country: 'Sri Lanka', lat: 6.9500, lng: 79.8500 },
  'chittagong': { name: 'Port of Chittagong', locode: 'BDCGP', country: 'Bangladesh', lat: 22.3133, lng: 91.8000 },
  'kochi': { name: 'Cochin Port (Kochi)', locode: 'INKOC', country: 'India', lat: 9.9667, lng: 76.2667 },
  'kandla': { name: 'Deendayal Port (Kandla)', locode: 'INIXY', country: 'India', lat: 23.0333, lng: 70.2167 },
  'vizag': { name: 'Visakhapatnam Port', locode: 'INVTZ', country: 'India', lat: 17.6833, lng: 83.2833 },
  'tuticorin': { name: 'V.O. Chidambaranar Port (Tuticorin)', locode: 'INTUT', country: 'India', lat: 8.7500, lng: 78.2000 },

  // ── East Asia ──
  'shanghai': { name: 'Port of Shanghai', locode: 'CNSHA', country: 'China', lat: 31.2304, lng: 121.4737 },
  'ningbo': { name: 'Port of Ningbo-Zhoushan', locode: 'CNNGB', country: 'China', lat: 29.8683, lng: 121.5440 },
  'shenzhen': { name: 'Port of Shenzhen (Yantian)', locode: 'CNYTN', country: 'China', lat: 22.5431, lng: 114.0579 },
  'guangzhou': { name: 'Port of Guangzhou (Nansha)', locode: 'CNGZQ', country: 'China', lat: 23.1291, lng: 113.2644 },
  'qingdao': { name: 'Port of Qingdao', locode: 'CNQDG', country: 'China', lat: 36.0671, lng: 120.3826 },
  'tianjin': { name: 'Port of Tianjin (Xingang)', locode: 'CNTXG', country: 'China', lat: 38.9833, lng: 117.7833 },
  'xiamen': { name: 'Port of Xiamen', locode: 'CNXMN', country: 'China', lat: 24.4798, lng: 118.0894 },
  'dalian': { name: 'Port of Dalian', locode: 'CNDLC', country: 'China', lat: 38.9137, lng: 121.6148 },
  'hong kong': { name: 'Port of Hong Kong', locode: 'HKHKG', country: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  'busan': { name: 'Port of Busan', locode: 'KRPUS', country: 'South Korea', lat: 35.1047, lng: 129.0400 },
  'incheon': { name: 'Port of Incheon', locode: 'KRINC', country: 'South Korea', lat: 37.4563, lng: 126.7052 },
  'kaohsiung': { name: 'Port of Kaohsiung', locode: 'TWKHH', country: 'Taiwan', lat: 22.6167, lng: 120.2833 },
  'keelung': { name: 'Port of Keelung', locode: 'TWKEL', country: 'Taiwan', lat: 25.1333, lng: 121.7333 },
  'tokyo': { name: 'Port of Tokyo', locode: 'JPTYO', country: 'Japan', lat: 35.6762, lng: 139.7893 },
  'yokohama': { name: 'Port of Yokohama', locode: 'JPYOK', country: 'Japan', lat: 35.4437, lng: 139.6380 },
  'kobe': { name: 'Port of Kobe', locode: 'JPUKB', country: 'Japan', lat: 34.6901, lng: 135.1955 },
  'nagoya': { name: 'Port of Nagoya', locode: 'JPNGO', country: 'Japan', lat: 35.0920, lng: 136.8770 },
  'osaka': { name: 'Port of Osaka', locode: 'JPOSA', country: 'Japan', lat: 34.6618, lng: 135.4998 },
  'singapore': { name: 'Port of Singapore', locode: 'SGSIN', country: 'Singapore', lat: 1.2801, lng: 103.8390 },
  'port klang': { name: 'Port Klang', locode: 'MYPKG', country: 'Malaysia', lat: 3.0000, lng: 101.4000 },
  'tanjung pelepas': { name: 'Port of Tanjung Pelepas', locode: 'MYTPP', country: 'Malaysia', lat: 1.3667, lng: 103.5333 },
  'laem chabang': { name: 'Port of Laem Chabang', locode: 'THLCH', country: 'Thailand', lat: 13.0833, lng: 100.8833 },
  'ho chi minh': { name: 'Port of Ho Chi Minh City (Cat Lai)', locode: 'VNSGN', country: 'Vietnam', lat: 10.7500, lng: 106.7000 },
  'haiphong': { name: 'Port of Haiphong', locode: 'VNHPH', country: 'Vietnam', lat: 20.8667, lng: 106.6833 },
  'manila': { name: 'Port of Manila', locode: 'PHMNL', country: 'Philippines', lat: 14.5833, lng: 120.9667 },
  'jakarta': { name: 'Port of Tanjung Priok (Jakarta)', locode: 'IDJKT', country: 'Indonesia', lat: -6.1000, lng: 106.8833 },
  'surabaya': { name: 'Port of Tanjung Perak (Surabaya)', locode: 'IDSUB', country: 'Indonesia', lat: -7.2000, lng: 112.7333 },

  // ── Africa ──
  'tanger med': { name: 'Tanger Med Port', locode: 'MAPTM', country: 'Morocco', lat: 35.8833, lng: -5.5000 },
  'casablanca': { name: 'Port of Casablanca', locode: 'MACAS', country: 'Morocco', lat: 33.6000, lng: -7.6167 },
  'dakar': { name: 'Port of Dakar', locode: 'SNDKR', country: 'Senegal', lat: 14.6833, lng: -17.4333 },
  'abidjan': { name: 'Port of Abidjan', locode: 'CIABJ', country: 'Côte d\'Ivoire', lat: 5.3167, lng: -4.0167 },
  'tema': { name: 'Port of Tema', locode: 'GHTMA', country: 'Ghana', lat: 5.6333, lng: -0.0167 },
  'lagos': { name: 'Apapa Port (Lagos)', locode: 'NGLOS', country: 'Nigeria', lat: 6.4500, lng: 3.4000 },
  'douala': { name: 'Port of Douala', locode: 'CMDLA', country: 'Cameroon', lat: 4.0500, lng: 9.7000 },
  'matadi': { name: 'Port of Matadi', locode: 'CDMAT', country: 'DR Congo', lat: -5.8167, lng: 13.4667 },
  'luanda': { name: 'Port of Luanda', locode: 'AOLAD', country: 'Angola', lat: -8.7833, lng: 13.2333 },
  'walvis bay': { name: 'Port of Walvis Bay', locode: 'NAWVB', country: 'Namibia', lat: -22.9500, lng: 14.5000 },
  'cape town': { name: 'Port of Cape Town', locode: 'ZACPT', country: 'South Africa', lat: -33.9081, lng: 18.4222 },
  'durban': { name: 'Port of Durban', locode: 'ZADUR', country: 'South Africa', lat: -29.8667, lng: 31.0167 },
  'ngqura': { name: 'Port of Ngqura', locode: 'ZANGQ', country: 'South Africa', lat: -33.8000, lng: 25.6833 },
  'maputo': { name: 'Port of Maputo', locode: 'MZMPM', country: 'Mozambique', lat: -25.9667, lng: 32.5833 },
  'nairobi': { name: 'Port of Mombasa', locode: 'KEMBA', country: 'Kenya', lat: -4.0667, lng: 39.6667 },
  'dar es salaam': { name: 'Port of Dar es Salaam', locode: 'TZDAR', country: 'Tanzania', lat: -6.8167, lng: 39.2833 },
  'djibouti': { name: 'Port of Djibouti', locode: 'DJJIB', country: 'Djibouti', lat: 11.6000, lng: 43.1500 },
  'sudan': { name: 'Port Sudan', locode: 'SDPZU', country: 'Sudan', lat: 19.6167, lng: 37.2167 },

  // ── South America ──
  'santos': { name: 'Port of Santos', locode: 'BRSSZ', country: 'Brazil', lat: -23.9500, lng: -46.3333 },
  'paranagua': { name: 'Port of Paranaguá', locode: 'BRPNG', country: 'Brazil', lat: -25.5167, lng: -48.5167 },
  'rio de janeiro': { name: 'Port of Rio de Janeiro', locode: 'BRRIO', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  'buenos aires': { name: 'Port of Buenos Aires', locode: 'ARBUE', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  'valparaiso': { name: 'Port of Valparaíso', locode: 'CLVAP', country: 'Chile', lat: -33.0472, lng: -71.6127 },
  'san antonio': { name: 'Port of San Antonio', locode: 'CLSAI', country: 'Chile', lat: -33.5833, lng: -71.6167 },
  'callao': { name: 'Port of Callao', locode: 'PECLL', country: 'Peru', lat: -12.0500, lng: -77.1500 },
  'guayaquil': { name: 'Port of Guayaquil', locode: 'ECGYE', country: 'Ecuador', lat: -2.1833, lng: -79.8833 },
  'buenaventura': { name: 'Port of Buenaventura', locode: 'COBUN', country: 'Colombia', lat: 3.8833, lng: -77.0667 },
  'cartagena': { name: 'Port of Cartagena', locode: 'COCTG', country: 'Colombia', lat: 10.4000, lng: -75.5167 },
  'colon': { name: 'Colón Container Terminal', locode: 'PAONX', country: 'Panama', lat: 9.3500, lng: -79.9000 },
  'manzanillo': { name: 'Port of Manzanillo', locode: 'MXZLO', country: 'Mexico', lat: 19.0500, lng: -104.3167 },
  'veracruz': { name: 'Port of Veracruz', locode: 'MXVER', country: 'Mexico', lat: 19.2000, lng: -96.1333 },

  // ── Oceania ──
  'sydney': { name: 'Port of Sydney', locode: 'AUSYD', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  'melbourne': { name: 'Port of Melbourne', locode: 'AUMEL', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  'brisbane': { name: 'Port of Brisbane', locode: 'AUBNE', country: 'Australia', lat: -27.4698, lng: 153.0251 },
  'fremantle': { name: 'Port of Fremantle', locode: 'AUFRE', country: 'Australia', lat: -32.0569, lng: 115.7439 },
  'auckland': { name: 'Port of Auckland', locode: 'NZAKL', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },

  // ── Northern Europe & Baltic ──
  'gdansk': { name: 'Port of Gdańsk', locode: 'PLGDN', country: 'Poland', lat: 54.3520, lng: 18.6466 },
  'gdynia': { name: 'Port of Gdynia', locode: 'PLGDY', country: 'Poland', lat: 54.5189, lng: 18.5305 },
  'klaipeda': { name: 'Port of Klaipėda', locode: 'LTKLJ', country: 'Lithuania', lat: 55.7033, lng: 21.1443 },
  'riga': { name: 'Freeport of Riga', locode: 'LVRIX', country: 'Latvia', lat: 56.9718, lng: 24.1043 },
  'tallinn': { name: 'Port of Tallinn (Muuga)', locode: 'EETLL', country: 'Estonia', lat: 59.4370, lng: 24.7536 },
  'helsinki': { name: 'Port of Helsinki', locode: 'FIHEL', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  'stockholm': { name: 'Port of Stockholm', locode: 'SESTO', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  'gothenburg': { name: 'Port of Gothenburg', locode: 'SEGOT', country: 'Sweden', lat: 57.7089, lng: 11.9746 },
  'oslo': { name: 'Port of Oslo', locode: 'NOOSL', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  'copenhagen': { name: 'Port of Copenhagen', locode: 'DKCPH', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  'aarhus': { name: 'Port of Aarhus', locode: 'DKAAR', country: 'Denmark', lat: 56.1567, lng: 10.2108 },
  'st petersburg': { name: 'Port of St. Petersburg', locode: 'RULED', country: 'Russia', lat: 59.9311, lng: 30.3609 },
  'novorossiysk': { name: 'Port of Novorossiysk', locode: 'RUNVS', country: 'Russia', lat: 44.7167, lng: 37.7833 },
};

/**
 * Resolve port coordinates from raw string input.
 */
export function resolvePortLocation(portQuery?: string | null): { name: string; locode: string; lat: number; lng: number } {
  if (!portQuery) {
    return { name: 'Port of Newark (USNWK)', locode: 'USNWK', lat: 40.6895, lng: -74.1745 };
  }

  const query = portQuery.toLowerCase().trim();
  for (const [key, data] of Object.entries(PORT_GEO_REGISTRY)) {
    if (query.includes(key) || data.locode.toLowerCase() === query) {
      return { name: data.name, locode: data.locode, lat: data.lat, lng: data.lng };
    }
  }

  // Fallback default
  if (query.includes('jebel') || query.includes('dubai') || query.includes('uae')) {
    const p = PORT_GEO_REGISTRY['jebel ali'];
    return { name: p.name, locode: p.locode, lat: p.lat, lng: p.lng };
  }

  return { name: portQuery, locode: 'PORT', lat: 40.6895, lng: -74.1745 };
}

/**
 * Haversine formula to compute great circle distance in Nautical Miles.
 */
export function haversineDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_NM = 3440.065; // Earth radius in nautical miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R_NM * c);
}

/**
 * Compute Initial Compass Bearing / Course Over Ground (0° to 360°).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return Math.round((toDeg(θ) + 360) % 360);
}

/**
 * Great circle intermediate point interpolation.
 */
function interpolateIntermediatePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): [number, number] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const d = 2 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin((φ1 - φ2) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ1 - λ2) / 2) ** 2
  )));

  if (Math.abs(d) < 1e-9) return [lat1, lon1];

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);

  return [toDeg(φi), toDeg(λi)];
}

/**
 * Generate high-resolution maritime sea route through canonical choke points.
 */
export function buildMaritimeRoute(
  originQuery: string,
  destinationQuery: string,
  progressPct = 65,
  departureDate?: Date | null,
  estimatedArrival?: Date | null
): SeaRouteAnalysis {
  const origin = resolvePortLocation(originQuery);
  const destination = resolvePortLocation(destinationQuery);

  // Assemble the sequential choke points for standard Transatlantic -> Med -> Suez -> Gulf corridor
  const isFromGulfOrEastUS = origin.lng < -60;
  const isToMersin = destination.name.toLowerCase().includes('mersin') || destinationQuery.toLowerCase().includes('mersin');
  const isToGulfOrUAE = destination.lng > 45 && destination.lat > 15;
  const isToAfrica = destination.lat < 40 && destination.lat > -35 && destination.lng > -20 && destination.lng < 45;
  const isToSouthAsia = destination.lng > 45 && destination.lng < 100 && destination.lat < 30;
  const isToEastAsia = destination.lng > 100 && destination.lat > 0;
  const isToOceania = destination.lat < 0 && destination.lng > 110;
  const isToSouthAmerica = destination.lng < -35 && destination.lat < 10;
  const isToWestAfrica = destination.lng > -20 && destination.lng < 15 && destination.lat < 20 && destination.lat > -5;

  // Determine if Cape of Good Hope route is preferred (Africa destinations, or South/East Asia from US East Coast)
  const useCapeRoute = isToAfrica || isToWestAfrica || (isFromGulfOrEastUS && (isToSouthAsia || isToEastAsia || isToOceania));

  const corridorWaypoints: MaritimeWaypoint[] = [];

  // 1. Origin
  corridorWaypoints.push({
    id: 'wp-origin',
    name: origin.name,
    code: origin.locode,
    type: 'port_origin',
    lat: origin.lat,
    lng: origin.lng,
    description: `Departure port: ${origin.name}`,
  });

  // 2. Outbound Sea Lane
  if (isFromGulfOrEastUS) {
    if (origin.lat < 30) {
      corridorWaypoints.push({
        id: 'wp-florida-strait',
        name: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.name,
        type: 'strait',
        lat: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.lat,
        lng: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.lng,
        description: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.description,
      });
    } else {
      corridorWaypoints.push({
        id: 'wp-us-offshore',
        name: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.lat,
        lng: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.lng,
        description: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.description,
      });
    }

    // Mid-Atlantic
    corridorWaypoints.push({
      id: 'wp-atlantic',
      name: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.lat,
      lng: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.lng,
      description: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.description,
    });
  }

  if (useCapeRoute) {
    // ── CAPE OF GOOD HOPE ROUTE ──
    corridorWaypoints.push({
      id: 'wp-cape-verde',
      name: MARITIME_CHOKEPOINTS.CAPE_VERDE_OFFSHORE.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.CAPE_VERDE_OFFSHORE.lat,
      lng: MARITIME_CHOKEPOINTS.CAPE_VERDE_OFFSHORE.lng,
      description: MARITIME_CHOKEPOINTS.CAPE_VERDE_OFFSHORE.description,
    });

    corridorWaypoints.push({
      id: 'wp-cape-good-hope',
      name: MARITIME_CHOKEPOINTS.CAPE_OF_GOOD_HOPE.name,
      type: 'strait',
      lat: MARITIME_CHOKEPOINTS.CAPE_OF_GOOD_HOPE.lat,
      lng: MARITIME_CHOKEPOINTS.CAPE_OF_GOOD_HOPE.lng,
      description: MARITIME_CHOKEPOINTS.CAPE_OF_GOOD_HOPE.description,
    });

    if (isToAfrica || isToWestAfrica) {
      // Northbound along Africa's west coast
      corridorWaypoints.push({
        id: 'wp-mozambique',
        name: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.lat,
        lng: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.lng,
        description: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.description,
      });
    } else {
      // Continue to Indian Ocean for Asia/Oceania
      corridorWaypoints.push({
        id: 'wp-mozambique',
        name: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.lat,
        lng: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.lng,
        description: MARITIME_CHOKEPOINTS.MOZAMBIQUE_CHANNEL.description,
      });

      corridorWaypoints.push({
        id: 'wp-arabian-sea',
        name: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lat,
        lng: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lng,
        description: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.description,
      });

      if (isToGulfOrUAE) {
        corridorWaypoints.push({
          id: 'wp-gulf-oman',
          name: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.name,
          type: 'sea_lane',
          lat: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lat,
          lng: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lng,
          description: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.description,
        });

        corridorWaypoints.push({
          id: 'wp-hormuz',
          name: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.name,
          type: 'strait',
          lat: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lat,
          lng: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lng,
          description: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.description,
        });

        corridorWaypoints.push({
          id: 'wp-gulf-south',
          name: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.name,
          type: 'sea_lane',
          lat: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lat,
          lng: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lng,
          description: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.description,
        });
      }

      if (isToEastAsia) {
        corridorWaypoints.push({
          id: 'wp-malacca',
          name: MARITIME_CHOKEPOINTS.MALACCA_STRAIT.name,
          type: 'strait',
          lat: MARITIME_CHOKEPOINTS.MALACCA_STRAIT.lat,
          lng: MARITIME_CHOKEPOINTS.MALACCA_STRAIT.lng,
          description: MARITIME_CHOKEPOINTS.MALACCA_STRAIT.description,
        });
      }
    }
  } else {
    // ── STANDARD SUEZ ROUTE ──
    // 3. Strait of Gibraltar (Key gateway for Europe/Middle East)
    corridorWaypoints.push({
      id: 'wp-gibraltar',
      name: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.name,
      type: 'strait',
      lat: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.lat,
      lng: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.lng,
      description: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.description,
    });

    // 4. Mediterranean Sea
    corridorWaypoints.push({
      id: 'wp-med-west',
      name: MARITIME_CHOKEPOINTS.MED_WEST.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.MED_WEST.lat,
      lng: MARITIME_CHOKEPOINTS.MED_WEST.lng,
      description: MARITIME_CHOKEPOINTS.MED_WEST.description,
    });

    corridorWaypoints.push({
      id: 'wp-med-sicily',
      name: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.name,
      type: 'strait',
      lat: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.lat,
      lng: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.lng,
      description: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.description,
    });

    if (isToMersin) {
      // Route direct to Mersin / Eastern Turkey
      corridorWaypoints.push({
        id: 'wp-mersin-gulf',
        name: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.lat,
        lng: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.lng,
        description: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.description,
      });
    } else {
      // Eastern Med -> Suez
      corridorWaypoints.push({
        id: 'wp-med-east',
        name: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.lat,
        lng: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.lng,
        description: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.description,
      });

      corridorWaypoints.push({
        id: 'wp-suez-north',
        name: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.name,
        type: 'canal',
        lat: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.lat,
        lng: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.lng,
        description: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.description,
      });

      corridorWaypoints.push({
        id: 'wp-suez-south',
        name: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.name,
        type: 'canal',
        lat: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.lat,
        lng: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.lng,
        description: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.description,
      });

      corridorWaypoints.push({
        id: 'wp-red-sea',
        name: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.lat,
        lng: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.lng,
        description: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.description,
      });

      corridorWaypoints.push({
        id: 'wp-bab-el-mandeb',
        name: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.name,
        type: 'strait',
        lat: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.lat,
        lng: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.lng,
        description: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.description,
      });

      corridorWaypoints.push({
        id: 'wp-gulf-aden',
        name: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.lat,
        lng: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.lng,
        description: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.description,
      });

      if (isToGulfOrUAE) {
        corridorWaypoints.push({
          id: 'wp-arabian-sea',
          name: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.name,
          type: 'sea_lane',
          lat: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lat,
          lng: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lng,
          description: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.description,
        });

        corridorWaypoints.push({
          id: 'wp-gulf-oman',
          name: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.name,
          type: 'sea_lane',
          lat: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lat,
          lng: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lng,
          description: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.description,
        });

        corridorWaypoints.push({
          id: 'wp-hormuz',
          name: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.name,
          type: 'strait',
          lat: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lat,
          lng: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lng,
          description: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.description,
        });

        corridorWaypoints.push({
          id: 'wp-gulf-south',
          name: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.name,
          type: 'sea_lane',
          lat: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lat,
          lng: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lng,
          description: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.description,
        });
      }
    }
  }

  // Final destination port
  corridorWaypoints.push({
    id: 'wp-destination',
    name: destination.name,
    code: destination.locode,
    type: 'port_destination',
    lat: destination.lat,
    lng: destination.lng,
    description: `Destination port: ${destination.name}`,
  });

  // Generate dense coordinates along the sea lane (smoothing between nodes)
  const denseRouteCoordinates: [number, number][] = [];
  let totalDistanceNM = 0;
  const segmentDistances: number[] = [];

  for (let i = 0; i < corridorWaypoints.length - 1; i++) {
    const p1 = corridorWaypoints[i];
    const p2 = corridorWaypoints[i + 1];
    const segDist = haversineDistanceNM(p1.lat, p1.lng, p2.lat, p2.lng);
    segmentDistances.push(segDist);
    totalDistanceNM += segDist;

    // Subdivide each segment into 12-25 points for smooth marine curve
    const steps = Math.max(8, Math.min(30, Math.floor(segDist / 120)));
    for (let s = 0; s <= steps; s++) {
      if (s === steps && i < corridorWaypoints.length - 2) continue; // avoid duplicating vertex
      const subFraction = s / steps;
      const interp = interpolateIntermediatePoint(p1.lat, p1.lng, p2.lat, p2.lng, subFraction);
      denseRouteCoordinates.push(interp);
    }
  }

  // Calculate vessel progress position
  const safeProgress = Math.min(100, Math.max(0, progressPct));
  const targetDistance = (safeProgress / 100) * totalDistanceNM;

  let accumulatedDist = 0;
  let activeWaypointIndex = 0;
  let vesselCurrentPos: GeoPoint = { lat: corridorWaypoints[0].lat, lng: corridorWaypoints[0].lng };
  let vesselHeading = 90;

  for (let i = 0; i < segmentDistances.length; i++) {
    const segDist = segmentDistances[i];
    if (accumulatedDist + segDist >= targetDistance || i === segmentDistances.length - 1) {
      activeWaypointIndex = i;
      const segmentFraction = segDist > 0 ? (targetDistance - accumulatedDist) / segDist : 0;
      const safeFraction = Math.min(1, Math.max(0, segmentFraction));
      const p1 = corridorWaypoints[i];
      const p2 = corridorWaypoints[i + 1];

      const [interpLat, interpLng] = interpolateIntermediatePoint(p1.lat, p1.lng, p2.lat, p2.lng, safeFraction);
      vesselCurrentPos = { lat: interpLat, lng: interpLng };
      vesselHeading = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
      break;
    }
    accumulatedDist += segDist;
  }

  // Mark waypoints as passed / active
  for (let i = 0; i < corridorWaypoints.length; i++) {
    if (i < activeWaypointIndex) {
      corridorWaypoints[i].passed = true;
      corridorWaypoints[i].active = false;
    } else if (i === activeWaypointIndex) {
      corridorWaypoints[i].passed = false;
      corridorWaypoints[i].active = true;
    } else {
      corridorWaypoints[i].passed = false;
      corridorWaypoints[i].active = false;
    }
  }

  const distanceCoveredNM = Math.round(targetDistance);
  const distanceRemainingNM = Math.max(0, totalDistanceNM - distanceCoveredNM);
  const totalDistanceKM = Math.round(totalDistanceNM * 1.852);

  // Speed and ETA calculations
  const vesselSpeedKnots = safeProgress >= 100 ? 0 : 18.5; // Average container ship cruising speed
  const hoursRemaining = vesselSpeedKnots > 0 ? distanceRemainingNM / vesselSpeedKnots : 0;
  const etaDays = Math.floor(hoursRemaining / 24);
  const etaHours = Math.round(hoursRemaining % 24);

  const etaDate = estimatedArrival 
    ? new Date(estimatedArrival) 
    : new Date(Date.now() + hoursRemaining * 3600 * 1000);

  const currentZone = corridorWaypoints[activeWaypointIndex]?.name || 'High Seas';

  // Geofencing: check if vessel is within arrival radius of destination (15 NM)
  const distanceToDestNM = haversineDistanceNM(
    vesselCurrentPos.lat, vesselCurrentPos.lng,
    destination.lat, destination.lng
  );
  const isAtDestination = safeProgress >= 100 || distanceToDestNM <= 15;

  // ETA confidence score based on route complexity and remaining distance
  const routeComplexity = useCapeRoute ? 0.85 : 0.92;
  const distanceFactor = Math.min(1, distanceRemainingNM / 10000);
  const etaConfidenceScore = Math.round(100 * routeComplexity * (1 - distanceFactor * 0.3));

  return {
    originPort: origin.name,
    destinationPort: destination.name,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destCoords: { lat: destination.lat, lng: destination.lng },
    waypoints: corridorWaypoints,
    denseRouteCoordinates,
    totalDistanceNM,
    totalDistanceKM,
    distanceCoveredNM,
    distanceRemainingNM,
    progressPct: safeProgress,
    vesselCurrentPos,
    vesselHeading,
    vesselSpeedKnots,
    etaDays,
    etaHours,
    etaDate,
    activeWaypointIndex,
    currentZoneName: currentZone,
    etaConfidenceScore,
    usesCapeRoute: useCapeRoute,
    isAtDestination,
    distanceToDestNM,
  };
}

/**
 * Generate simulated AIS telematics for a container vessel.
 */
export function generateVesselAISTelemetry(
  vesselName = 'MAERSK MC-KINNEY MOLLER',
  voyageNumber = 'V-2409W',
  routeAnalysis: SeaRouteAnalysis
): VesselAISTelemetry {
  const isComplete = routeAnalysis.progressPct >= 100;
  const isStarted = routeAnalysis.progressPct > 0;

  // Realistic IMO & MMSI generation based on vessel name
  const nameHash = vesselName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imoNumber = `IMO 9${(nameHash * 13) % 900000 + 100000}`;
  const mmsi = `219${(nameHash * 73) % 900000 + 100000}`;

  // Sea State based on ocean region
  const zone = routeAnalysis.currentZoneName.toLowerCase();
  let seaState = 'Moderate (1.2m - 1.8m swell)';
  let waveHeightMeters = 1.4;
  let windKnots = 16;
  let windDir = 'ENE';
  let waterTemp = 24;

  if (zone.includes('atlantic')) {
    seaState = 'Moderate to Rough (2.1m swell)';
    waveHeightMeters = 2.1;
    windKnots = 22;
    windDir = 'WNW';
    waterTemp = 19;
  } else if (zone.includes('red sea') || zone.includes('suez')) {
    seaState = 'Smooth to Slight (0.6m chop)';
    waveHeightMeters = 0.6;
    windKnots = 11;
    windDir = 'NNW';
    waterTemp = 28;
  } else if (zone.includes('gulf') || zone.includes('hormuz')) {
    seaState = 'Calm (0.4m sea)';
    waveHeightMeters = 0.4;
    windKnots = 8;
    windDir = 'SE';
    waterTemp = 30;
  }

  return {
    vesselName,
    voyageNumber,
    imoNumber,
    mmsi,
    flag: {
      country: 'Denmark',
      code: 'DK',
      emoji: '🇩🇰',
    },
    vesselType: 'Fully Cellular Container Ship (ULCS)',
    lengthMeters: 399,
    beamMeters: 59,
    draughtMeters: 14.8,
    currentPosition: routeAnalysis.vesselCurrentPos,
    headingDegrees: routeAnalysis.vesselHeading,
    speedKnots: isComplete ? 0 : isStarted ? routeAnalysis.vesselSpeedKnots : 0,
    navigationalStatus: isComplete ? 'Moored / Berth' : isStarted ? 'Underway using Engine' : 'At Anchor / Loading',
    aisStation: 'Satellite AIS (Orbcomm Maritime Constellation)',
    lastSignalTime: '2 mins ago (Live AIS)',
    weather: {
      seaState,
      waveHeightMeters,
      windSpeedKnots: windKnots,
      windDirection: windDir,
      waterTempC: waterTemp,
    },
  };
}
