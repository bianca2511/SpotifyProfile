const clientId = "60183ea4bf804cc48dfe6fae76168e88";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");


// store the token in the local storage so it persists after page refresh
let storedToken = localStorage.getItem("accessToken");
let storedExpiration = localStorage.getItem("expirationTime");

// if the token is not expired, continue to use it 
if (storedToken !== undefined && storedExpiration && Date.now() < storedExpiration) {
  const profile = await fetchProfile(storedToken);
  console.log(profile);
  populateUI(profile);

} else if (!code) { // if the initial code does not exist, authenticate with spotify

  redirectToAuthCodeFlow(clientId);

} else { // if token does not exist or is expired, ask for one
  const tokenData = await getAccessToken(clientId, code);
  localStorage.setItem("accessToken", tokenData.access_token);
  localStorage.setItem("expirationTime", tokenData.expirationTime);

  const profile = await fetchProfile(tokenData.access_token);
  console.log(profile);
  populateUI(profile);
}

///////////////////////////////////////////////
// Redirecting to the Spotify authentication //

export async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// function for getting the access token and calculating the expiration time
async function getAccessToken(clientId, code) {
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("code_verifier", verifier);

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  const { access_token, expires_in } = await result.json();

  const expirationTime = Date.now() + expires_in * 1000;

  return { access_token, expirationTime };
}


///////////////////////////////////////////////////////////////////

async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  return await result.json();
}

function populateUI(profile) {
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[1]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[1].url;
    document.getElementById("avatar").appendChild(profileImage);
    document.getElementById("imgUrl").innerText = profile.images[1].url;
  }
  document.getElementById("id").innerText = profile.id;
  document.getElementById("email").innerText = profile.email;
  document.getElementById("uri").innerText = profile.uri;
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url").innerText = profile.href;
  document.getElementById("url").setAttribute("href", profile.href);
}
