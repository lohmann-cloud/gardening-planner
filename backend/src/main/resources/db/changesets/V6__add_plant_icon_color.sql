ALTER TABLE plant ADD COLUMN icon_emoji VARCHAR(16);
ALTER TABLE plant ADD COLUMN color_hex VARCHAR(7);

-- ─── GEMÜSE ───────────────────────────────────────────────────────────────────
UPDATE plant SET icon_emoji = '🍅', color_hex = '#e53935' WHERE id = 'a1000000-0000-0000-0000-000000000001'; -- Tomate
UPDATE plant SET icon_emoji = '🥒', color_hex = '#7cb342' WHERE id = 'a1000000-0000-0000-0000-000000000002'; -- Gurke
UPDATE plant SET icon_emoji = '🫑', color_hex = '#ef6c00' WHERE id = 'a1000000-0000-0000-0000-000000000003'; -- Paprika
UPDATE plant SET icon_emoji = '🥒', color_hex = '#558b2f' WHERE id = 'a1000000-0000-0000-0000-000000000004'; -- Zucchini
UPDATE plant SET icon_emoji = '🎃', color_hex = '#f57c00' WHERE id = 'a1000000-0000-0000-0000-000000000005'; -- Kürbis
UPDATE plant SET icon_emoji = '🥬', color_hex = '#9ccc65' WHERE id = 'a1000000-0000-0000-0000-000000000006'; -- Kopfsalat
UPDATE plant SET icon_emoji = '🥬', color_hex = '#33691e' WHERE id = 'a1000000-0000-0000-0000-000000000007'; -- Spinat
UPDATE plant SET icon_emoji = '🌱', color_hex = '#aed581' WHERE id = 'a1000000-0000-0000-0000-000000000008'; -- Feldsalat
UPDATE plant SET icon_emoji = '🥕', color_hex = '#fb8c00' WHERE id = 'a1000000-0000-0000-0000-000000000009'; -- Möhre
UPDATE plant SET icon_emoji = '🍠', color_hex = '#ad1457' WHERE id = 'a1000000-0000-0000-0000-000000000010'; -- Rote Bete
UPDATE plant SET icon_emoji = '🌶️', color_hex = '#e91e63' WHERE id = 'a1000000-0000-0000-0000-000000000011'; -- Radieschen
UPDATE plant SET icon_emoji = '🥬', color_hex = '#cddc39' WHERE id = 'a1000000-0000-0000-0000-000000000012'; -- Kohlrabi
UPDATE plant SET icon_emoji = '🥦', color_hex = '#43a047' WHERE id = 'a1000000-0000-0000-0000-000000000013'; -- Brokkoli
UPDATE plant SET icon_emoji = '🥦', color_hex = '#c5e1a5' WHERE id = 'a1000000-0000-0000-0000-000000000014'; -- Blumenkohl
UPDATE plant SET icon_emoji = '🥬', color_hex = '#a5d6a7' WHERE id = 'a1000000-0000-0000-0000-000000000015'; -- Weißkohl
UPDATE plant SET icon_emoji = '🧅', color_hex = '#bcaaa4' WHERE id = 'a1000000-0000-0000-0000-000000000016'; -- Zwiebel
UPDATE plant SET icon_emoji = '🧄', color_hex = '#e0e0e0' WHERE id = 'a1000000-0000-0000-0000-000000000017'; -- Knoblauch
UPDATE plant SET icon_emoji = '🧅', color_hex = '#9ccc65' WHERE id = 'a1000000-0000-0000-0000-000000000018'; -- Lauchzwiebel
UPDATE plant SET icon_emoji = '🫛', color_hex = '#66bb6a' WHERE id = 'a1000000-0000-0000-0000-000000000019'; -- Erbse
UPDATE plant SET icon_emoji = '🫘', color_hex = '#8d6e63' WHERE id = 'a1000000-0000-0000-0000-000000000020'; -- Buschbohne
UPDATE plant SET icon_emoji = '🫘', color_hex = '#5d4037' WHERE id = 'a1000000-0000-0000-0000-000000000021'; -- Stangenbohne
UPDATE plant SET icon_emoji = '🥔', color_hex = '#a1887f' WHERE id = 'a1000000-0000-0000-0000-000000000022'; -- Kartoffel
UPDATE plant SET icon_emoji = '🌽', color_hex = '#fdd835' WHERE id = 'a1000000-0000-0000-0000-000000000023'; -- Mais
UPDATE plant SET icon_emoji = '🥬', color_hex = '#c62828' WHERE id = 'a1000000-0000-0000-0000-000000000024'; -- Mangold
UPDATE plant SET icon_emoji = '🌱', color_hex = '#9ccc65' WHERE id = 'a1000000-0000-0000-0000-000000000025'; -- Porree

-- ─── KRÄUTER (alle 🌿, eigene Grüntöne) ───────────────────────────────────────
UPDATE plant SET icon_emoji = '🌿', color_hex = '#66bb6a' WHERE id = 'a2000000-0000-0000-0000-000000000001'; -- Basilikum
UPDATE plant SET icon_emoji = '🌿', color_hex = '#388e3c' WHERE id = 'a2000000-0000-0000-0000-000000000002'; -- Petersilie
UPDATE plant SET icon_emoji = '🌿', color_hex = '#7cb342' WHERE id = 'a2000000-0000-0000-0000-000000000003'; -- Schnittlauch
UPDATE plant SET icon_emoji = '🌿', color_hex = '#aed581' WHERE id = 'a2000000-0000-0000-0000-000000000004'; -- Dill
UPDATE plant SET icon_emoji = '🌿', color_hex = '#81c784' WHERE id = 'a2000000-0000-0000-0000-000000000005'; -- Koriander
UPDATE plant SET icon_emoji = '🌿', color_hex = '#00897b' WHERE id = 'a2000000-0000-0000-0000-000000000006'; -- Minze
UPDATE plant SET icon_emoji = '🌿', color_hex = '#33691e' WHERE id = 'a2000000-0000-0000-0000-000000000007'; -- Rosmarin
UPDATE plant SET icon_emoji = '🌿', color_hex = '#558b2f' WHERE id = 'a2000000-0000-0000-0000-000000000008'; -- Thymian
UPDATE plant SET icon_emoji = '🌿', color_hex = '#9e9d24' WHERE id = 'a2000000-0000-0000-0000-000000000009'; -- Salbei
UPDATE plant SET icon_emoji = '🌿', color_hex = '#689f38' WHERE id = 'a2000000-0000-0000-0000-000000000010'; -- Oregano
UPDATE plant SET icon_emoji = '🌿', color_hex = '#827717' WHERE id = 'a2000000-0000-0000-0000-000000000011'; -- Liebstöckel
UPDATE plant SET icon_emoji = '🌿', color_hex = '#c0ca33' WHERE id = 'a2000000-0000-0000-0000-000000000012'; -- Zitronenmelisse

-- ─── FRÜCHTE ──────────────────────────────────────────────────────────────────
UPDATE plant SET icon_emoji = '🍓', color_hex = '#ef5350' WHERE id = 'a3000000-0000-0000-0000-000000000001'; -- Erdbeere
UPDATE plant SET icon_emoji = '🫐', color_hex = '#c2185b' WHERE id = 'a3000000-0000-0000-0000-000000000002'; -- Himbeere
UPDATE plant SET icon_emoji = '🫐', color_hex = '#d32f2f' WHERE id = 'a3000000-0000-0000-0000-000000000003'; -- Johannisbeere
UPDATE plant SET icon_emoji = '🫐', color_hex = '#9e9d24' WHERE id = 'a3000000-0000-0000-0000-000000000004'; -- Stachelbeere
UPDATE plant SET icon_emoji = '🫐', color_hex = '#5e35b1' WHERE id = 'a3000000-0000-0000-0000-000000000005'; -- Heidelbeere

-- ─── BLUMEN ───────────────────────────────────────────────────────────────────
UPDATE plant SET icon_emoji = '🌼', color_hex = '#ff9800' WHERE id = 'a4000000-0000-0000-0000-000000000001'; -- Ringelblume
UPDATE plant SET icon_emoji = '🌸', color_hex = '#ef6c00' WHERE id = 'a4000000-0000-0000-0000-000000000002'; -- Kapuzinerkresse
UPDATE plant SET icon_emoji = '🌼', color_hex = '#f57c00' WHERE id = 'a4000000-0000-0000-0000-000000000003'; -- Tagetes
UPDATE plant SET icon_emoji = '🌻', color_hex = '#fbc02d' WHERE id = 'a4000000-0000-0000-0000-000000000004'; -- Sonnenblume
UPDATE plant SET icon_emoji = '🌸', color_hex = '#1976d2' WHERE id = 'a4000000-0000-0000-0000-000000000005'; -- Borretsch
UPDATE plant SET icon_emoji = '💜', color_hex = '#7b1fa2' WHERE id = 'a4000000-0000-0000-0000-000000000006'; -- Phacelia
UPDATE plant SET icon_emoji = '💐', color_hex = '#7e57c2' WHERE id = 'a4000000-0000-0000-0000-000000000007'; -- Lavendel
