# Scripts

## Create tour from JSON (no web UI)

Create a tour by sending a JSON payload to the API.

### 1. Get an auth token

Use either method below. The token is a JWT; use it as `AUTH_TOKEN` when running the script.

**Option A – Login API (recommended)**  
The login response includes `token` in the body. From the project root:

```bash
# Replace with your admin or seller email/password
curl -s -X POST http://localhost:8000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword","keepMeSignedIn":false}'
```

Then copy the `token` value from the response (e.g. `response.data.token` or `data.token` depending on wrapper). Example with `jq`:

```bash
curl -s -X POST http://localhost:8000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword","keepMeSignedIn":false}' \
  | jq -r '.data.token'
```

**Option B – From the browser**  
1. Log in at your app’s login page.  
2. Open DevTools → Network.  
3. Find the `login` request → Response Headers → `Set-Cookie`.  
4. Copy the value of the `token` cookie (the part after `token=` and before the next `;`).

### 2. Run the script

From the **project root**:

```bash
# Use example payload (scripts/tour-payload.example.json)
AUTH_TOKEN=your_jwt node scripts/create-tour-from-json.mjs

# Use your own JSON file
AUTH_TOKEN=your_jwt node scripts/create-tour-from-json.mjs path/to/your-tour.json
```

### 3. Payload format

The JSON must match the **flat** structure expected by the API (same as FormData keys, but as JSON):

- **Required:** `title` (min 3 chars), `description` (min 10 chars), `code` (min 6 chars), `excerpt` (min 1 char)
- **Optional:** `tourStatus`, `price`, `pricePerPerson`, `minSize`, `maxSize`, `tourDates`, `category`, `itinerary`, `include`, `exclude`, `location`, `facts`, `faqs`, `gallery`, etc.

**Category:** Send an array of `{ "label": "Category name", "value": "mongooseObjectId" }`. The server stores only the `value` (ObjectId); the API returns `category: [{ label, value }]` (populated from GlobalCategory).

**Description, outline, include, exclude:** Can be rich text JSON (e.g. `{"type":"doc","content":[...]}`). Stored as-is so formatting is preserved.

See `scripts/tour-payload.example.json` for a full example.

### Environment

- `AUTH_TOKEN` – JWT for a user with admin or seller role (required)
- `NEXT_PUBLIC_BACKEND_URL` or `BACKEND_URL` – API base URL (default: `http://localhost:8000`)

### Note

The create-tour endpoint is normally used with `multipart/form-data` (web UI). Sending `application/json` works because the server uses `express.json()`; the same `extractTourFields` logic runs on `req.body`. For file uploads (coverImage, file), use the web UI or multipart.
