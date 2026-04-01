SELECT 
    DISTINCT
    linienid || "-" || richtungstext as bus_line_key,
    linienid,
    linientext,
    richtungstext
FROM {{ ref('stg_raw_bus_positions') }}

WHERE operation = 'MODIFY'

