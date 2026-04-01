SELECT 
    fahrtbezeichner,
    operation,
    latitude,
    longitude,
    linientext,
    linienid,
    linienid || "-" || richtungstext as bus_line_key,
    -- richtungstext
    --richtungsid
    delay,
    sequenz,
    fahrtstatus,
    fahrzeugid,
    nachhst,
    akthst,
    starthst,
    zielhst,
    MINUTE(kafka_timestamp) as minute,
    HOUR(kafka_timestamp) as hour,
    betriebstag, -- key for dim_dates as its the date
    from_unixtime(abfahrtstart) as abfahrtstart_ts,
    from_unixtime(ankunftziel) as ankunftziel_ts,
    from_unixtime(visfahrplanlagezst) as visfahrplanlagezst_ts,
    kafka_timestamp,
    _loaded_at
FROM {{ ref('stg_raw_bus_positions') }}
