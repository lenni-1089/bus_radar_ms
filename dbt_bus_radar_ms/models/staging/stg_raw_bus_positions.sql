SELECT *
FROM
    {{ source('raw_bus_positions', 'raw_positions') }}