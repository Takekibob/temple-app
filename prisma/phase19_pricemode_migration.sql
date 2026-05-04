-- Phase 19: priceMode データ移行
-- fee > 0 のイベントを FIXED に設定する（fee = 0 はデフォルトの FREE のまま）

UPDATE events SET "priceMode" = 'FIXED' WHERE fee > 0;
