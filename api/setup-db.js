import
 { createPool } 
from
 
'@vercel/postgres'
;
import
 fallbackConfig 
from
 
'../js/config.js'
; // adjust 
path
 
if
 needed
// Helper 
to
 send 
JSON
 responses
const 
json
 = (res, status, payload) => {
  res.status(status).json(payload);
};
let pool; // reuse pool across invocations
function
 getPool() {
  
if
 (pool) 
return
 pool;
  const conn = process.env.PC_POSTGRES_URL;
  
if
 (!conn) {
    throw 
new
 Error(
'MISSING_ENV_PC_POSTGRES_URL'
);
  }
  // Initialize pool 
using
 the 
connection
 string
  pool = createPool({ connectionString: conn });
  
return
 pool;
}
export 
default
 async 
function
 
handler
(req, res) {
  // 
Only
 allow POST 
to
 avoid accidental 
GET
-triggered 
schema
 changes
  
if
 (req.
method
 !== 
'POST'
) {
    
return
 
json
(res, 
405
, { error: 
'Method not allowed. Use POST.'
 });
  }
  // Basic auth/guard: 
in
 production you should protect this endpoint.
  // 
For
 now we allow it but you should remove 
or
 protect 
after
 running once.
  try {
    const pool = getPool();
    const 
sql
 = pool.
sql
;
    // Run statements 
in
 
sequence
. These are idempotent.
    await 
sql
`
      
CREATE
 
TABLE
 
IF
 
NOT
 
EXISTS
 postcard_logs (
        id 
SERIAL
 
PRIMARY KEY
,
        sender_name 
VARCHAR
(
255
),
        sender_email 
VARCHAR
(
255
) 
NOT
 
NULL
,
        recipient_name 
VARCHAR
(
255
),
        recipient_line1 
TEXT
,
        recipient_line2 
TEXT
,
        recipient_city 
VARCHAR
(
255
),
        recipient_postcode 
VARCHAR
(
255
),
        recipient_country 
VARCHAR
(
255
),
        front_image_url 
TEXT
,
        back_image_url 
TEXT
,
        sent_at 
TIMESTAMPTZ
 
DEFAULT
 NOW()
      );
    `;
    await 
sql
`
      
CREATE
 
TABLE
 
IF
 
NOT
 
EXISTS
 
configuration
 (
        id 
INT
 
PRIMARY KEY
,
        settings 
JSONB

      );
    `;
    // 
Insert
 
default
 config 
only
 
if
 
not
 present
    const settings = 
JSON
.stringify(fallbackConfig);
    await 
sql
`
      
INSERT
 
INTO
 
configuration
 (id, settings)
      
VALUES
 (
1
, ${settings})
      
ON
 
CONFLICT
 (id) 
DO
 
NOTHING
;
    `;
    
return
 
json
(res, 
200
, { message: 
'Tables created and configuration initialized.'
 });
  } catch (err) {
    // Handle missing env separately 
to
 provide clearer guidance
    
if
 (err?.message === 
'MISSING_ENV_PC_POSTGRES_URL'
) {
      console.error(
'PC_POSTGRES_URL is not defined'
);
      
return
 
json
(res, 
500
, {
        error: 
'Missing environment variable'
,
        details: 
'PC_POSTGRES_URL is not defined. Set it in Vercel/your environment.'
,
      });
    }
    // Library initialization error 
or
 
SQL
 error
    console.error(
'DB setup error:'
, err.message || err);
    
return
 
json
(res, 
500
, {
      error: 
'Database setup failed'
,
      details: err.message || String(err),
    });
  }