-- Standard plant catalog seed data
-- Categories: VEGETABLE, HERB, FRUIT, FLOWER
-- Sun: FULL_SUN, PARTIAL_SHADE, FULL_SHADE
-- Water: LOW, MEDIUM, HIGH
-- Nutrient demand: HEAVY, MEDIUM, LIGHT

INSERT INTO plant (id, name, botanical_name, family, category, sun_requirement, water_requirement,
                   spacing_cm, row_spacing_cm, height_min_cm, height_max_cm,
                   nutrient_demand, rotation_years, days_to_maturity, is_custom) VALUES

-- ─── GEMÜSE ────────────────────────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000001', 'Tomate',        'Solanum lycopersicum',           'Solanaceae',       'VEGETABLE', 'FULL_SUN',      'MEDIUM', 50, 60,  60, 200, 'HEAVY',  3, 75,  FALSE),
('a1000000-0000-0000-0000-000000000002', 'Gurke',         'Cucumis sativus',                'Cucurbitaceae',    'VEGETABLE', 'FULL_SUN',      'HIGH',   40, 50, 100, 200, 'HEAVY',  3, 60,  FALSE),
('a1000000-0000-0000-0000-000000000003', 'Paprika',       'Capsicum annuum',                'Solanaceae',       'VEGETABLE', 'FULL_SUN',      'MEDIUM', 40, 50,  40,  80, 'MEDIUM', 3, 80,  FALSE),
('a1000000-0000-0000-0000-000000000004', 'Zucchini',      'Cucurbita pepo',                 'Cucurbitaceae',    'VEGETABLE', 'FULL_SUN',      'MEDIUM', 80,100,  40,  60, 'HEAVY',  3, 55,  FALSE),
('a1000000-0000-0000-0000-000000000005', 'Kürbis',        'Cucurbita maxima',               'Cucurbitaceae',    'VEGETABLE', 'FULL_SUN',      'MEDIUM',100,150,  30,  50, 'HEAVY',  3,110,  FALSE),
('a1000000-0000-0000-0000-000000000006', 'Kopfsalat',     'Lactuca sativa',                 'Asteraceae',       'VEGETABLE', 'PARTIAL_SHADE', 'MEDIUM', 25, 30,  20,  30, 'MEDIUM', 1, 50,  FALSE),
('a1000000-0000-0000-0000-000000000007', 'Spinat',        'Spinacia oleracea',              'Amaranthaceae',    'VEGETABLE', 'PARTIAL_SHADE', 'MEDIUM', 10, 20,  20,  30, 'MEDIUM', 2, 45,  FALSE),
('a1000000-0000-0000-0000-000000000008', 'Feldsalat',     'Valerianella locusta',           'Caprifoliaceae',   'VEGETABLE', 'PARTIAL_SHADE', 'LOW',    10, 15,  10,  20, 'LIGHT',  1, 50,  FALSE),
('a1000000-0000-0000-0000-000000000009', 'Möhre',         'Daucus carota subsp. sativus',   'Apiaceae',         'VEGETABLE', 'FULL_SUN',      'LOW',     5, 20,  30,  40, 'MEDIUM', 3, 75,  FALSE),
('a1000000-0000-0000-0000-000000000010', 'Rote Bete',     'Beta vulgaris subsp. vulgaris',  'Amaranthaceae',    'VEGETABLE', 'FULL_SUN',      'MEDIUM', 10, 25,  30,  50, 'MEDIUM', 3, 60,  FALSE),
('a1000000-0000-0000-0000-000000000011', 'Radieschen',    'Raphanus sativus var. sativus',  'Brassicaceae',     'VEGETABLE', 'FULL_SUN',      'MEDIUM',  5, 15,  20,  30, 'LIGHT',  1, 28,  FALSE),
('a1000000-0000-0000-0000-000000000012', 'Kohlrabi',      'Brassica oleracea var. gongylodes','Brassicaceae',   'VEGETABLE', 'FULL_SUN',      'MEDIUM', 25, 30,  30,  40, 'HEAVY',  3, 55,  FALSE),
('a1000000-0000-0000-0000-000000000013', 'Brokkoli',      'Brassica oleracea var. italica', 'Brassicaceae',     'VEGETABLE', 'FULL_SUN',      'MEDIUM', 40, 50,  60,  90, 'HEAVY',  4, 70,  FALSE),
('a1000000-0000-0000-0000-000000000014', 'Blumenkohl',    'Brassica oleracea var. botrytis','Brassicaceae',     'VEGETABLE', 'FULL_SUN',      'MEDIUM', 50, 60,  50,  80, 'HEAVY',  4, 85,  FALSE),
('a1000000-0000-0000-0000-000000000015', 'Weißkohl',      'Brassica oleracea var. capitata','Brassicaceae',     'VEGETABLE', 'FULL_SUN',      'HIGH',   50, 60,  30,  60, 'HEAVY',  4, 90,  FALSE),
('a1000000-0000-0000-0000-000000000016', 'Zwiebel',       'Allium cepa',                    'Amaryllidaceae',   'VEGETABLE', 'FULL_SUN',      'LOW',    10, 25,  30,  50, 'MEDIUM', 3,110,  FALSE),
('a1000000-0000-0000-0000-000000000017', 'Knoblauch',     'Allium sativum',                 'Amaryllidaceae',   'VEGETABLE', 'FULL_SUN',      'LOW',    10, 20,  30,  60, 'LIGHT',  3,240,  FALSE),
('a1000000-0000-0000-0000-000000000018', 'Lauchzwiebel',  'Allium fistulosum',              'Amaryllidaceae',   'VEGETABLE', 'FULL_SUN',      'MEDIUM',  5, 15,  30,  50, 'LIGHT',  2, 60,  FALSE),
('a1000000-0000-0000-0000-000000000019', 'Erbse',         'Pisum sativum',                  'Fabaceae',         'VEGETABLE', 'FULL_SUN',      'MEDIUM',  5, 15,  60, 150, 'LIGHT',  3, 65,  FALSE),
('a1000000-0000-0000-0000-000000000020', 'Buschbohne',    'Phaseolus vulgaris var. nanus',  'Fabaceae',         'VEGETABLE', 'FULL_SUN',      'MEDIUM', 20, 40,  30,  50, 'LIGHT',  3, 60,  FALSE),
('a1000000-0000-0000-0000-000000000021', 'Stangenbohne',  'Phaseolus vulgaris var. vulgaris','Fabaceae',        'VEGETABLE', 'FULL_SUN',      'MEDIUM', 20, 50,  200,400, 'LIGHT',  3, 65,  FALSE),
('a1000000-0000-0000-0000-000000000022', 'Kartoffel',     'Solanum tuberosum',              'Solanaceae',       'VEGETABLE', 'FULL_SUN',      'MEDIUM', 35, 65,  60,  80, 'HEAVY',  4, 90,  FALSE),
('a1000000-0000-0000-0000-000000000023', 'Mais',          'Zea mays',                       'Poaceae',          'VEGETABLE', 'FULL_SUN',      'MEDIUM', 30, 70, 150, 250, 'HEAVY',  3, 80,  FALSE),
('a1000000-0000-0000-0000-000000000024', 'Mangold',       'Beta vulgaris subsp. cicla',     'Amaranthaceae',    'VEGETABLE', 'PARTIAL_SHADE', 'MEDIUM', 30, 40,  40,  80, 'MEDIUM', 2, 60,  FALSE),
('a1000000-0000-0000-0000-000000000025', 'Porree',        'Allium ampeloprasum var. porrum', 'Amaryllidaceae',  'VEGETABLE', 'FULL_SUN',      'MEDIUM', 15, 30,  50,  80, 'HEAVY',  3,120,  FALSE),

-- ─── KRÄUTER ───────────────────────────────────────────────────────────────────
('a2000000-0000-0000-0000-000000000001', 'Basilikum',     'Ocimum basilicum',               'Lamiaceae',        'HERB', 'FULL_SUN',      'MEDIUM', 20, 25,  20,  50, 'MEDIUM', 1, 28, FALSE),
('a2000000-0000-0000-0000-000000000002', 'Petersilie',    'Petroselinum crispum',           'Apiaceae',         'HERB', 'PARTIAL_SHADE', 'MEDIUM', 15, 20,  20,  40, 'MEDIUM', 2, 80, FALSE),
('a2000000-0000-0000-0000-000000000003', 'Schnittlauch',  'Allium schoenoprasum',           'Amaryllidaceae',   'HERB', 'PARTIAL_SHADE', 'MEDIUM', 20, 20,  20,  40, 'LIGHT',  1, 35, FALSE),
('a2000000-0000-0000-0000-000000000004', 'Dill',          'Anethum graveolens',             'Apiaceae',         'HERB', 'FULL_SUN',      'LOW',    20, 25,  40, 120, 'LIGHT',  2, 50, FALSE),
('a2000000-0000-0000-0000-000000000005', 'Koriander',     'Coriandrum sativum',             'Apiaceae',         'HERB', 'FULL_SUN',      'LOW',    15, 20,  30,  70, 'LIGHT',  1, 55, FALSE),
('a2000000-0000-0000-0000-000000000006', 'Minze',         'Mentha',                         'Lamiaceae',        'HERB', 'PARTIAL_SHADE', 'HIGH',   30, 40,  30,  90, 'MEDIUM', 1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000007', 'Rosmarin',      'Salvia rosmarinus',              'Lamiaceae',        'HERB', 'FULL_SUN',      'LOW',    40, 50,  50, 150, 'LIGHT',  1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000008', 'Thymian',       'Thymus vulgaris',                'Lamiaceae',        'HERB', 'FULL_SUN',      'LOW',    25, 30,  15,  30, 'LIGHT',  1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000009', 'Salbei',        'Salvia officinalis',             'Lamiaceae',        'HERB', 'FULL_SUN',      'LOW',    40, 50,  30,  70, 'LIGHT',  1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000010', 'Oregano',       'Origanum vulgare',               'Lamiaceae',        'HERB', 'FULL_SUN',      'LOW',    30, 40,  20,  60, 'LIGHT',  1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000011', 'Liebstöckel',   'Levisticum officinale',          'Apiaceae',         'HERB', 'PARTIAL_SHADE', 'MEDIUM', 60, 80, 100, 200, 'MEDIUM', 1, NULL, FALSE),
('a2000000-0000-0000-0000-000000000012', 'Zitronenmelisse','Melissa officinalis',           'Lamiaceae',        'HERB', 'PARTIAL_SHADE', 'MEDIUM', 40, 50,  30,  80, 'LIGHT',  1, NULL, FALSE),

-- ─── FRÜCHTE ───────────────────────────────────────────────────────────────────
('a3000000-0000-0000-0000-000000000001', 'Erdbeere',         'Fragaria × ananassa',         'Rosaceae',         'FRUIT', 'FULL_SUN',      'MEDIUM', 30, 40,  10,  20, 'MEDIUM', 4, NULL, FALSE),
('a3000000-0000-0000-0000-000000000002', 'Himbeere',         'Rubus idaeus',                'Rosaceae',         'FRUIT', 'FULL_SUN',      'MEDIUM', 50, 100, 100, 180, 'MEDIUM', 1, NULL, FALSE),
('a3000000-0000-0000-0000-000000000003', 'Johannisbeere',    'Ribes rubrum',                'Grossulariaceae',  'FRUIT', 'PARTIAL_SHADE', 'MEDIUM', 100,150, 100, 150, 'MEDIUM', 1, NULL, FALSE),
('a3000000-0000-0000-0000-000000000004', 'Stachelbeere',     'Ribes uva-crispa',            'Grossulariaceae',  'FRUIT', 'PARTIAL_SHADE', 'MEDIUM', 100,150, 100, 150, 'LIGHT',  1, NULL, FALSE),
('a3000000-0000-0000-0000-000000000005', 'Heidelbeere',      'Vaccinium corymbosum',        'Ericaceae',        'FRUIT', 'FULL_SUN',      'MEDIUM', 100,150, 100, 200, 'LIGHT',  1, NULL, FALSE),

-- ─── BLUMEN (Nützlinge & Begleitpflanzen) ──────────────────────────────────────
('a4000000-0000-0000-0000-000000000001', 'Ringelblume',      'Calendula officinalis',       'Asteraceae',       'FLOWER', 'FULL_SUN', 'LOW',    20, 25, 30,  50, 'LIGHT', 1, 50, FALSE),
('a4000000-0000-0000-0000-000000000002', 'Kapuzinerkresse',  'Tropaeolum majus',            'Tropaeolaceae',    'FLOWER', 'FULL_SUN', 'LOW',    25, 30, 20,  30, 'LIGHT', 1, 45, FALSE),
('a4000000-0000-0000-0000-000000000003', 'Tagetes',          'Tagetes',                     'Asteraceae',       'FLOWER', 'FULL_SUN', 'LOW',    20, 25, 20,  40, 'LIGHT', 1, 45, FALSE),
('a4000000-0000-0000-0000-000000000004', 'Sonnenblume',      'Helianthus annuus',           'Asteraceae',       'FLOWER', 'FULL_SUN', 'LOW',    50, 60,100, 300, 'MEDIUM',2, 80, FALSE),
('a4000000-0000-0000-0000-000000000005', 'Borretsch',        'Borago officinalis',          'Boraginaceae',     'FLOWER', 'FULL_SUN', 'LOW',    30, 40, 30,  80, 'LIGHT', 1, 50, FALSE),
('a4000000-0000-0000-0000-000000000006', 'Phacelia',         'Phacelia tanacetifolia',      'Hydrophyllaceae',  'FLOWER', 'FULL_SUN', 'LOW',    15, 20, 30,  60, 'LIGHT', 1, 35, FALSE),
('a4000000-0000-0000-0000-000000000007', 'Lavendel',         'Lavandula angustifolia',      'Lamiaceae',        'FLOWER', 'FULL_SUN', 'LOW',    40, 50, 30,  60, 'LIGHT', 1, NULL, FALSE);


-- ─── SAISONS ───────────────────────────────────────────────────────────────────

-- Tomaten, Gurken, Paprika, Zucchini, Kürbis → Frühjahr + Sommer
INSERT INTO plant_season (plant_id, season) VALUES
('a1000000-0000-0000-0000-000000000001', 'SPRING'),
('a1000000-0000-0000-0000-000000000001', 'SUMMER'),
('a1000000-0000-0000-0000-000000000002', 'SPRING'),
('a1000000-0000-0000-0000-000000000002', 'SUMMER'),
('a1000000-0000-0000-0000-000000000003', 'SPRING'),
('a1000000-0000-0000-0000-000000000003', 'SUMMER'),
('a1000000-0000-0000-0000-000000000004', 'SPRING'),
('a1000000-0000-0000-0000-000000000004', 'SUMMER'),
('a1000000-0000-0000-0000-000000000005', 'SPRING'),
('a1000000-0000-0000-0000-000000000005', 'SUMMER'),

-- Salate → Frühjahr + Herbst (kühle Jahreszeiten)
('a1000000-0000-0000-0000-000000000006', 'SPRING'),
('a1000000-0000-0000-0000-000000000006', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000007', 'SPRING'),
('a1000000-0000-0000-0000-000000000007', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000008', 'SPRING'),
('a1000000-0000-0000-0000-000000000008', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000008', 'WINTER'),

-- Möhre, Rote Bete → Frühjahr + Sommer + Herbst
('a1000000-0000-0000-0000-000000000009', 'SPRING'),
('a1000000-0000-0000-0000-000000000009', 'SUMMER'),
('a1000000-0000-0000-0000-000000000009', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000010', 'SPRING'),
('a1000000-0000-0000-0000-000000000010', 'SUMMER'),
('a1000000-0000-0000-0000-000000000010', 'AUTUMN'),

-- Radieschen → Frühjahr + Herbst
('a1000000-0000-0000-0000-000000000011', 'SPRING'),
('a1000000-0000-0000-0000-000000000011', 'AUTUMN'),

-- Kohlarten → Frühjahr bis Herbst
('a1000000-0000-0000-0000-000000000012', 'SPRING'),
('a1000000-0000-0000-0000-000000000012', 'SUMMER'),
('a1000000-0000-0000-0000-000000000012', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000013', 'SPRING'),
('a1000000-0000-0000-0000-000000000013', 'SUMMER'),
('a1000000-0000-0000-0000-000000000013', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000014', 'SPRING'),
('a1000000-0000-0000-0000-000000000014', 'SUMMER'),
('a1000000-0000-0000-0000-000000000014', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000015', 'SPRING'),
('a1000000-0000-0000-0000-000000000015', 'SUMMER'),
('a1000000-0000-0000-0000-000000000015', 'AUTUMN'),

-- Zwiebeln, Knoblauch
('a1000000-0000-0000-0000-000000000016', 'SPRING'),
('a1000000-0000-0000-0000-000000000016', 'SUMMER'),
('a1000000-0000-0000-0000-000000000017', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000017', 'SPRING'),
('a1000000-0000-0000-0000-000000000018', 'SPRING'),
('a1000000-0000-0000-0000-000000000018', 'SUMMER'),
('a1000000-0000-0000-0000-000000000018', 'AUTUMN'),

-- Erbsen, Bohnen
('a1000000-0000-0000-0000-000000000019', 'SPRING'),
('a1000000-0000-0000-0000-000000000020', 'SPRING'),
('a1000000-0000-0000-0000-000000000020', 'SUMMER'),
('a1000000-0000-0000-0000-000000000021', 'SPRING'),
('a1000000-0000-0000-0000-000000000021', 'SUMMER'),

-- Kartoffel, Mais
('a1000000-0000-0000-0000-000000000022', 'SPRING'),
('a1000000-0000-0000-0000-000000000022', 'SUMMER'),
('a1000000-0000-0000-0000-000000000023', 'SPRING'),
('a1000000-0000-0000-0000-000000000023', 'SUMMER'),

-- Mangold, Porree
('a1000000-0000-0000-0000-000000000024', 'SPRING'),
('a1000000-0000-0000-0000-000000000024', 'SUMMER'),
('a1000000-0000-0000-0000-000000000024', 'AUTUMN'),
('a1000000-0000-0000-0000-000000000025', 'SPRING'),
('a1000000-0000-0000-0000-000000000025', 'SUMMER'),
('a1000000-0000-0000-0000-000000000025', 'AUTUMN'),

-- Kräuter
('a2000000-0000-0000-0000-000000000001', 'SPRING'),
('a2000000-0000-0000-0000-000000000001', 'SUMMER'),
('a2000000-0000-0000-0000-000000000002', 'SPRING'),
('a2000000-0000-0000-0000-000000000002', 'SUMMER'),
('a2000000-0000-0000-0000-000000000002', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000003', 'SPRING'),
('a2000000-0000-0000-0000-000000000003', 'SUMMER'),
('a2000000-0000-0000-0000-000000000003', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000004', 'SPRING'),
('a2000000-0000-0000-0000-000000000004', 'SUMMER'),
('a2000000-0000-0000-0000-000000000005', 'SPRING'),
('a2000000-0000-0000-0000-000000000005', 'SUMMER'),
('a2000000-0000-0000-0000-000000000006', 'SPRING'),
('a2000000-0000-0000-0000-000000000006', 'SUMMER'),
('a2000000-0000-0000-0000-000000000006', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000007', 'SPRING'),
('a2000000-0000-0000-0000-000000000007', 'SUMMER'),
('a2000000-0000-0000-0000-000000000007', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000008', 'SPRING'),
('a2000000-0000-0000-0000-000000000008', 'SUMMER'),
('a2000000-0000-0000-0000-000000000008', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000009', 'SPRING'),
('a2000000-0000-0000-0000-000000000009', 'SUMMER'),
('a2000000-0000-0000-0000-000000000009', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000010', 'SPRING'),
('a2000000-0000-0000-0000-000000000010', 'SUMMER'),
('a2000000-0000-0000-0000-000000000010', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000011', 'SPRING'),
('a2000000-0000-0000-0000-000000000011', 'SUMMER'),
('a2000000-0000-0000-0000-000000000011', 'AUTUMN'),
('a2000000-0000-0000-0000-000000000012', 'SPRING'),
('a2000000-0000-0000-0000-000000000012', 'SUMMER'),
('a2000000-0000-0000-0000-000000000012', 'AUTUMN'),

-- Früchte
('a3000000-0000-0000-0000-000000000001', 'SPRING'),
('a3000000-0000-0000-0000-000000000001', 'SUMMER'),
('a3000000-0000-0000-0000-000000000002', 'SUMMER'),
('a3000000-0000-0000-0000-000000000002', 'AUTUMN'),
('a3000000-0000-0000-0000-000000000003', 'SUMMER'),
('a3000000-0000-0000-0000-000000000004', 'SUMMER'),
('a3000000-0000-0000-0000-000000000004', 'AUTUMN'),
('a3000000-0000-0000-0000-000000000005', 'SUMMER'),

-- Blumen
('a4000000-0000-0000-0000-000000000001', 'SPRING'),
('a4000000-0000-0000-0000-000000000001', 'SUMMER'),
('a4000000-0000-0000-0000-000000000001', 'AUTUMN'),
('a4000000-0000-0000-0000-000000000002', 'SPRING'),
('a4000000-0000-0000-0000-000000000002', 'SUMMER'),
('a4000000-0000-0000-0000-000000000002', 'AUTUMN'),
('a4000000-0000-0000-0000-000000000003', 'SPRING'),
('a4000000-0000-0000-0000-000000000003', 'SUMMER'),
('a4000000-0000-0000-0000-000000000003', 'AUTUMN'),
('a4000000-0000-0000-0000-000000000004', 'SPRING'),
('a4000000-0000-0000-0000-000000000004', 'SUMMER'),
('a4000000-0000-0000-0000-000000000005', 'SPRING'),
('a4000000-0000-0000-0000-000000000005', 'SUMMER'),
('a4000000-0000-0000-0000-000000000006', 'SPRING'),
('a4000000-0000-0000-0000-000000000006', 'SUMMER'),
('a4000000-0000-0000-0000-000000000007', 'SPRING'),
('a4000000-0000-0000-0000-000000000007', 'SUMMER'),
('a4000000-0000-0000-0000-000000000007', 'AUTUMN');
