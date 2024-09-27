const axios = require("axios");
const fs = require("fs");
const convertJam = require("./getJam");

let tokens = fs
  .readFileSync("token.txt", "utf-8")
  .split("\n")
  .map((token) => token.replace("\r", ""))
  .filter((token) => token.trim() !== "");

function validateToken(token) {
  return token && token.trim().length > 0;
}

const DelayWaktu = (waktu) =>
  new Promise((resolve) => setTimeout(resolve, waktu));
let totalBlum = 0;

async function refreshToken(token, tanpaBearer) {
  const refresh = {
    refresh: tanpaBearer,
  };
  try {
    const response = await axios.post(
      `https://user-domain.blum.codes/api/v1/auth/refresh`,
      refresh,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    return response.data.refresh;
  } catch (error) {
    console.log("Error refreshing token:", error);
    return null;
  }
}

async function getTasks(token, index) {
  try {
    const response = await axios.get(
      "https://game-domain.blum.codes/api/v1/user/balance",
      {
        headers: {
          Authorization: `${token}`,
        },
      }
    );
    const datanya = response.data;
    const statusClaimRef = await getClaim(token);
    const diamon = datanya?.playPasses;
    if (!response.data.farming) {
      console.log("startTime tidak terdeteksi, mengulang...");
      await StartFarming(token);
    }
    const nama = await getProfile(token);
    const claimWaktu = convertJam(
      response.data.farming.startTime,
      response.data.farming.endTime
    );
    const jam = parseWaktuClaim(claimWaktu);
    console.table({
      "No Akun": `${index + 1}/${tokens.length}`,
      Nama: nama ? nama.nama : "Unknown",
      "Saldo Blum": datanya?.availableBalance + " $BLUM",
      "Claim Balance": datanya?.farming.balance + " $BLUM",
      "Sisa Diamon": diamon,
      "Waktu Claim": claimWaktu,
      "Status Claim Token":
        jam < 60 && jam >= 10
          ? "Persiapan Untuk Claim"
          : diamon > 0
          ? "Menjalankan Bermain Game mengunggu 30s"
          : "Menunggu Waktu Claim...",
      "Status Claim Ref":
        statusClaimRef?.canClaim === true
          ? "Sedang Claim Token..."
          : statusClaimRef?.canClaim,
    });
    totalBlum += parseInt(datanya?.availableBalance);
    if (diamon > 0) {
      await getIdGame(token);
    }
    if (jam < 1) {
      console.log("melakukan claim token...");
      await CLaimToken(token);
      console.log("Start Mining lagi...");
      await StartFarming(token);
    }
    await DailyLogin(token);
  } catch (error) {
    console.error(
      "Error fetching tasks:",
      error.response ? error.response.data : error.message
    );
  }
}

function parseWaktuClaim(waktuClaim) {
  let totalMinutes = 0;
  const jamMatch = waktuClaim.match(/(\d+)\s*jam/);
  const menitMatch = waktuClaim.match(/(\d+)\s*menit/);
  if (jamMatch) {
    totalMinutes += parseInt(jamMatch[1]) * 60;
  }
  if (menitMatch) {
    totalMinutes += parseInt(menitMatch[1]);
  }
  return totalMinutes;
}

async function loop() {
  while (true) {
    const newTokens = [];
    for (let [index, tokennya] of tokens.entries()) {
      const token = `Bearer ${tokennya.trim()}`;
      if (validateToken(tokennya)) {
        await getTasks(token, index);
        const RefreshToken = await refreshToken(token, tokennya.trim());
        if (RefreshToken) {
          newTokens.push(RefreshToken);
        } else {
          newTokens.push(tokennya); // Keep the old token if refreshing failed
        }
        await DelayWaktu(500);
      } else {
        console.error("Token tidak valid:", tokennya);
      }
    }
    tokens = newTokens;
    fs.writeFileSync("token.txt", tokens.join("\n"), "utf-8");
    console.log("Tokens berhasil diperbarui di token.txt");
    console.table({
      [`Total Blum ${tokens.length} Akun`]: `${totalBlum} $BLUM`,
    });
    console.log("Menunggu 5 Detik Untuk Cek Kembali");
    totalBlum = 0;
    await DelayWaktu(5000);
  }
}

loop();

async function getProfile(token) {
  try {
    const profile = await axios.get(`https://user-domain.blum.codes/api/v1/user/me`, {
      headers: {
        Authorization: `${token}`,
      },
    });
    const username = profile.data.username;
    return { nama: username, data: profile.data };
  } catch (error) {
    console.error(
      "Error fetching profile:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

async function CLaimToken(token) {
  try {
    const response = await axios.post(
      `https://game-domain.blum.codes/api/v1/farming/claim`,
      {},
      {
        headers: {
          Authorization: token,
        },
      }
    );
    console.log(`responsenya claim`, response);
  } catch (error) {
    console.log(`ini dari error`);
    console.log(error?.response);
  }
}

async function StartFarming(token) {
  try {
    const response = await axios.post(
      `https://game-domain.blum.codes/api/v1/farming/start`,
      {},
      {
        headers: {
          Authorization: token,
        },
      }
    );
    console.log(`responsenya startFarm`, response);
  } catch (error) {
    console.log(error?.response?.data);
  }
}

async function getIdGame(token) {
  let detik = 30;
  try {
    const response = await axios.post(
      `https://game-domain.blum.codes/api/v1/game/play`,
      {},
      {
        headers: {
          Authorization: token,
        },
      }
    );
    const gameId = response.data.gameId;
    if (!gameId) {
      throw new Error("gameId not found in response");
    }
    for (let index = 0; index < 30; index++) {
      detik--;
      await DelayWaktu(1000);
    }
    await dropGame(token, gameId);
  } catch (error) {
    console.error(`Error Mendapatkan id Game / tunggu besok`);
  }
}

function getRandomNumber() {
  const min = 260;
  const max = 280;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function dropGame(token, gameId) {
  const randomNumber = getRandomNumber();
  const body = {
    gameId: gameId,
    points: randomNumber,
  };
  try {
    const response = await axios.post(
      `https://game-domain.blum.codes/api/v1/game/claim`,
      body,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    if (response.data === "OK") {
      console.log(`Sukses Claim`, randomNumber, "$BLUM");
    }
  } catch (error) {
    console.error(`Error in dropGame:`, error);
  }
}

async function DailyLogin(token) {
  try {
    const response = await axios.get(
      `https://game-domain.blum.codes/api/v1/daily-reward?offset=-420`,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    if (response?.data) {
      console.log(`Daily login`);
      await axios.post(
        `https://game-domain.blum.codes/api/v1/daily-reward?offset=-420`,
        {},
        {
          headers: {
            Authorization: token,
          },
        }
      );
    }
  } catch (error) {
    console.log(error?.response?.data);
  }
}

async function getClaim(token) {
  try {
    const response = await axios.get(
      `https://user-domain.blum.codes/api/v1/friends/balance`,
      {
        headers: {
          Authorization: token,
        },
      }
    );
    if (response.data?.canClaim === true) {
      await axios.post(
        `https://user-domain.blum.codes/api/v1/friends/claim`,
        {},
        {
          headers: {
            Authorization: token,
          },
        }
      );
    }
    return response.data;
  } catch (error) {
    console.log(error);
  }
}
