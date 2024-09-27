function convertJam(start, end) {
  const currentLocalTime = new Date().getTime();
  const endTimeDifference = end - currentLocalTime;

  // Jika endTimeDifference negatif, berarti waktu klaim telah berlalu
  if (endTimeDifference <= 0) {
    return "0 jam dan 0 menit";
  }

  // Fungsi untuk mengubah selisih waktu dalam milidetik menjadi jam dan menit
  function formatTimeDifference(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} jam dan ${minutes} menit`;
  }

  return formatTimeDifference(endTimeDifference);
}

module.exports = convertJam;
