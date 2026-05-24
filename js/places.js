const PlacesModule = (() => {
  const BASE_URL = 'https://places.googleapis.com/v1';

  // Places API (New) のテキスト検索
  const search = async (query) => {
    const res = await fetch(`${BASE_URL}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': CONFIG.MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types'
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'ja' })
    });

    if (!res.ok) {
      console.error('Places API 検索エラー:', res.status, res.statusText);
      throw new Error('スポットの検索に失敗しました');
    }

    const data = await res.json();
    return (data.places || []).map(_normalizeSearchResult);
  };

  // Places API (New) の詳細情報取得
  const getDetail = async (placeId) => {
    const fields = [
      'id', 'displayName', 'formattedAddress', 'internationalPhoneNumber',
      'regularOpeningHours', 'rating', 'photos', 'websiteUri', 'location'
    ].join(',');

    const res = await fetch(`${BASE_URL}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': CONFIG.MAPS_API_KEY,
        'X-Goog-FieldMask': fields,
        'Accept-Language': 'ja'
      }
    });

    if (!res.ok) {
      console.error('Places API 詳細取得エラー:', res.status, res.statusText);
      throw new Error('スポット情報の取得に失敗しました');
    }

    const data = await res.json();
    return _normalizeDetail(data);
  };

  // 写真URLを生成する
  const getPhotoUrl = (photoName, maxWidth = 400) => {
    return `${BASE_URL}/${photoName}/media?maxWidthPx=${maxWidth}&key=${CONFIG.MAPS_API_KEY}`;
  };

  // 検索結果を正規化
  const _normalizeSearchResult = (place) => ({
    place_id: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    types: place.types || []
  });

  // 詳細情報を正規化
  const _normalizeDetail = (place) => ({
    place_id: place.id,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    phone: place.internationalPhoneNumber || null,
    rating: place.rating || null,
    website: place.websiteUri || null,
    location: place.location || null,
    openingHours: place.regularOpeningHours?.weekdayDescriptions || null,
    photos: (place.photos || []).slice(0, 5).map(p => p.name)
  });

  return { search, getDetail, getPhotoUrl };
})();
