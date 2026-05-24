const StorageModule = (() => {
  const rs = new RemoteStorage();
  rs.access.claim('mapboard', 'rw');
  rs.caching.enable('/mapboard/');

  const client = rs.scope('/mapboard/');

  client.declareType('spot', {
    type: 'object',
    properties: {
      place_id: { type: 'string' },
      name:     { type: 'string' },
      category: { type: 'string' },
      memo:     { type: 'string' },
      visited:  { type: 'boolean' },
      saved_at: { type: 'string' }
    },
    required: ['place_id', 'name']
  });

  // 全スポット取得
  const getSpots = async () => {
    const listing = await client.getListing('spots/');
    if (!listing) return {};

    const keys = Object.keys(listing).filter(k => !k.endsWith('/'));
    const spots = {};

    await Promise.all(keys.map(async (key) => {
      const spot = await client.getObject(`spots/${key}`);
      if (spot) spots[spot.place_id] = spot;
    }));

    return spots;
  };

  // スポット保存・更新
  const saveSpot = async (spot) => {
    if (!spot.place_id) throw new Error('place_id が必要です');
    if (!spot.saved_at) {
      spot = { ...spot, saved_at: new Date().toISOString().slice(0, 10) };
    }
    await client.storeObject('spot', `spots/${spot.place_id}`, spot);
  };

  // スポット削除
  const deleteSpot = async (id) => {
    await client.remove(`spots/${id}`);
  };

  return { getSpots, saveSpot, deleteSpot, rs };
})();
