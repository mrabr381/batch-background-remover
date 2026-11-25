// Precomputed mask for the red-mug demo photo (demo/index.html, section 1).
// Produced by the repo's own Python CLI (rembg + U2-Net) from the real Pexels
// photo "red mug" by Andreea Ch:
//   https://images.pexels.com/photos/3961751/pexels-photo-3961751.jpeg?auto=compress&cs=tinysrgb&w=1200
// Full-resolution (1200x800) measured stats, matching sample_output/real_photo_stats.json:
//   95.81% transparent, 0.61% edge, 3.57% product kept; all four corners alpha 0,
//   product-centre alpha 254; bbox [716, 439, 995, 648].
// The mask below is that same U2-Net mask downscaled to 300x200 (Lanczos) and
// embedded as base64 PNG text so the repo stays text-only (no binary files).
// Its own band stats are 95.78% transparent / 0.70% edge / 3.52% opaque --
// the page shows these live-computed numbers next to the published full-res ones.
window.MUG_MASK = {
  width: 300,
  height: 200,
  pngBase64: "iVBORw0KGgoAAAANSUhEUgAAASwAAADICAAAAAB3tIOJAAAFRUlEQVR4nO3bTWwbRRQH8Pdm/NF8EKTmizYkAVEEPQBqK0WFQ1EOqEgIOEGPIBUuFAHiEIkDJy7lwAUhUQk4cKrggKBwQgQpBxoVtRwQFKGEQpuIqknrtE3i2N6deRyc2o7tdbzrVcLE/9/FsTPazfw9M3473hABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA03i7/4ComImIpepFYSn3SIhIqKpJS+eM71BbiZvPgJmFJJbIHA2LqKe3b3dP5670rlRCk5BYIrFijfE8z/M949vC2urq6mo2R0S1YzASF8Ni6R57cuz+/q6kCmghIiJi8tnlpUxm4ersxcv5WE4cx0G2mLL7Tx2h4npUOWCk/ChiLeuEKnZv7covn03GMLYSLR9h6wnNfZJ6LKGYOfDNLi7uRkiIVPqh0fOTIZa5nebYvDW2GSLWt+eeuyuOKeTiyCJSdjnd5LQSIuILZ2JZb9wMi0iC1vY6TZlyKpY52Pw5/0+YbIjOs79iYzmtm2EJqRB/OOeWmIm55Zno6jRMhHmX/ZyIEJFqsZJ3NSwOEZak93R4rBMmH+o6qZabYXG49SP1wsOeJDu8+empq6TiuU50h6Znl6W5Omu92CrKTb897OZVSws0PbOyMSxpHJYtXit6YqdfTEZOy81pSHVKhwZFqkx+2z2wZ+TBXvLo8MejHxZi2YNwhaanq6ehBI4uI9kJIqLeQ6+fFcnJ0huq9SrCIZqO3q5Zs4JmopHshCpuQAy8uyh5+ftoxPLSzaKU6hUAwVOLtTVWWOmF907Mpbz7XuqykYaWs2GF7C0TiTWKv3x/RcmBR6P129WwwhCl13+yTN9c0HzvgWgHaoewqLyeCy/+WLDdo6FHJhG5G1ZNGd6w86VNB+H8bzmhAR2pdnA1rFAf/rZyh2buBlN3sq3Cqr3AC06PxVS0un2dKR2tinc1rI0jq/j1dGBj65V+FMovS9RuOxvWxqfSMC3rVz4xRH4h0k6Nq2FtJCTBRakQmYqn6W6mbL6titKazkqDW0D8QsWT/kGmW+1VwYfqrPXvtGdR+/vEXot274OrYVWn1bCUqPg0lJ7Hu3jpUrRzOhtWlYZ7xbYUFtPImKJ/zkfbiXc1rAZVVe1LpbBYEuMPWPp9Jtru384Lq75iOCz3PN+pbkyaNgsroLdc7xfll9T4Qcvnvov4fZirYdXvbd2oygu8siPHezhzOqPaLKz6qUj9Nat4Ia1s54nDwme+ivp9havf7kjQrR71cmBmZiabeu3VpPrpZFZFvE/E2bDCDA5rxIrQyJuvdKmLE39Gzao9wkrtVh1dQ+PHDrGaeets5KzaISxFPS8/MTi8t4+Jpt+Zip6VozQ9tRjiXoc7tzrcPLWvpU80Z0eW2bxNiV3LMeXnfv56ym9pXLkallfYvM06UbMf/KG8W9cWiVqbg66GlVkYtnrzZkREQjNf3CQiYg4sOJrjZlFq6a/vmx0lwjKfV1opljB37dbjZljC2U9PK22t3bT/YtW/kzkxm7fcuZhGTl4u/juT55cZY4wxlS9YMZ8Px3Szn7M3KrEkHzlycN9QX2fjdoXrP3z0ayGeUeVsWMVNmruH9g4ODPT3dqcT6VQ6pTUziRjrFTzPK6wuL8xfuTSbietfnNwNi5hLdXxKa9ZaJxIJrVjE931jrDHG8xsfIuwZYz3almMmJgm+9mEOeRnZ+GxxHWhbcdVjaaemfT8BAQAAAAAAAAAAAAAAAAAAAAAAAAAAtt1/dx77ywJCpcYAAAAASUVORK5CYII=",
  fullResStats: { transparent: 95.81, edge: 0.61, opaque: 3.57 },
  previewStats: { transparent: 95.78, edge: 0.70, opaque: 3.52 }
};
