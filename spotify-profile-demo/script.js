const clientId = "60183ea4bf804cc48dfe6fae76168e88";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// store the token in the local storage so it persists after page refresh
let storedToken = sessionStorage.getItem("tokenData");

/** @type {AccessToken | null} */
let parsedToken = null;
if (storedToken !== null) {
  parsedToken = JSON.parse(storedToken);
}

if (code !== null) {
  // if there is an authentication code, exchange it for a token
  const tokenData = await getAccessToken(clientId, code);
  if (tokenData !== null) {
    sessionStorage.setItem("tokenData", JSON.stringify(tokenData));
  }

  window.location.href = "/"; // IMPORTANT LINE, DO NOT REMOVE
} else if (parsedToken !== null && Date.now() < parsedToken.expiration_time) {
  // if the token is not expired, continue to use it
  const profile = await fetchProfile(parsedToken);
  const likedSongs = await fetchLikedSongs(parsedToken);

  // console.log(profile);
  populateProfileUI(profile);
  populateLikedSongsList(profile, likedSongs);
} else {
  // if the initial code does not exist, authenticate with spotify

  redirectToAuthCodeFlow(clientId);
}

///////////////////////////////////////////////
// Redirecting to the Spotify authentication //

/**
 * @param {string} clientId
 */
async function redirectToAuthCodeFlow(clientId) {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  sessionStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email user-library-read");
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**result.ok
 * @param {number} length
 */
function generateCodeVerifier(length) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * @param {string} codeVerifier
 */
async function generateCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * @typedef AccessToken
 * @property {string} access_token
 * @property {number} expiration_time
 */

/**
 * function for getting the access token and calculating the expiration time
 *
 * @param {string} clientId
 * @param {string} code
 *
 * @returns {Promise<AccessToken | null>}
 */
async function getAccessToken(clientId, code) {
  const verifier = sessionStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");
  if (verifier !== null) {
    params.append("code_verifier", verifier);
  }

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!result.ok) {
    return null;
  }

  const { access_token, expires_in } = await result.json();

  const expiration_time = Date.now() + expires_in * 1000;

  return { access_token, expiration_time };
}

///////////////////////////////////////////////////////////////////

/**
 * @param {AccessToken} token
 */
async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  // TODO: check result.ok

  return await result.json();
}

/**
 * @param {AccessToken} token
 */
async function fetchLikedSongs(token) {
  const result = await fetch("https://api.spotify.com/v1/me/tracks", {
    method: "GET",
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  // TODO: check result.ok

  return await result.json();
}

/**
 * @param {{ display_name: string; images: { url: string; }[]; id: string; email: string; uri: string; external_urls: { spotify: string; }; }} profile
 */
function populateProfileUI(profile) {
  // @ts-ignore
  document.getElementById("displayName").innerText = profile.display_name;
  if (profile.images[1]) {
    const profileImage = new Image(200, 200);
    profileImage.src = profile.images[1].url;
    // @ts-ignore
    document.getElementById("avatar").appendChild(profileImage);
  }
  // @ts-ignore
  document.getElementById("id").innerText = profile.id;
  // @ts-ignore
  document.getElementById("email").innerText = profile.email;
  // @ts-ignore
  document.getElementById("uri").innerText = profile.uri;
  // @ts-ignore
  document
    .getElementById("uri")
    .setAttribute("href", profile.external_urls.spotify);
}

/**
 * @param {{ display_name: string; }} profile
 */
// @ts-ignore
function populateLikedSongsList(profile, likedSongs) {
  // @ts-ignore
  document.getElementById("displayName2").innerText =
    profile.display_name.split(" ")[0];

  const likedSongsTable = document.getElementById("likedSongsTableBody");

  // @ts-ignore
  likedSongs.items.forEach((element) => {
    const track = element.track;
    const artistName = track.artists[0].name;
    const trackName = track.name;
    const popularity = track.popularity;
    const timestamp = element.added_at;

    console.log(trackName, artistName, popularity, timestamp);

    // @ts-ignore
    const row = likedSongsTable?.insertRow();

    const nameCell = row.insertCell(0);
    nameCell.innerHTML = trackName;

    const artistCell = row.insertCell(1);
    artistCell.innerHTML = artistName;

    const popularityCell = row.insertCell(2);
    popularityCell.innerHTML = popularity;

    const timestampCell = row.insertCell(3);
    timestampCell.innerHTML = timestamp;

    // likedSongsTable?.appendChild(row);
  });
}

export {};
