import { db } from "./firebase.js";
import { collection, addDoc, getDoc, getDocs, query, orderBy, limit, doc, setDoc, where, updateDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

async function saveScore(username, score, details) {
  try {
      const scoresRef = collection(db, "scores");
      const q = query(scoresRef, where("name", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const existingScore = existingDoc.data().score;
          const userDocRef = doc(db, "scores", existingDoc.id);

          const confirmReplace = confirm(
              `Le joueur "${username}" a déjà un score de ${existingScore}. Voulez-vous écraser ce score avec ${score} ?`
          );

          if (confirmReplace) {
              await updateDoc(userDocRef, {
                  score: parseFloat(score),
                  timestamp: new Date(),
                  details: details  // mise à jour des infos détaillées
              });
              console.log(`Score mis à jour pour ${username} : ${score}`);
              getLeaderboard();
          } else {
              console.log("Mise à jour annulée.");
          }
      } else {
          await setDoc(doc(scoresRef), {
              name: username,
              score: parseFloat(score),
              timestamp: new Date(),
              details: details  // sauvegarde des infos détaillées
          });
          console.log("Nouveau score enregistré pour :", username);
          getLeaderboard();
      }
  } catch (e) {
      console.error("Erreur lors de l'enregistrement :", e);
  }
}


function calculateAllLuck() {
  const packsEntry = document.getElementById('packsOpened').value;
  const packsOpened = parseInt(packsEntry) || 0;
  document.getElementById('individualResults').innerHTML = '';
  if (packsOpened <= 0) {
    document.getElementById('errorHandling').innerHTML = 'Veuillez entrer un nombre valide de paquets ouverts.';
    return;
  }
  if (packsOpened > 10000) {
    document.getElementById('errorHandling').innerHTML = 'Le nombre de paquets est trop élevé (max 10 000).';
    return;
  }
  document.getElementById('errorHandling').innerHTML = '';

  calculateLuck(packsOpened, 'crown');
  calculateLuck(packsOpened, 'three star');
  calculateLuck(packsOpened, 'two star');
  calculateLuck(packsOpened, 'one star');
  calculateLuck(packsOpened, 'four diamond');
  calculateLuck(packsOpened, 'rare');

  calculateGlobalLuck();
}

function calculateLuck(packsOpened, cardType) {
  let numCardsInput, resultStr = '';
  const rarePackRate = 1/2000;
  const normalPackRate = 1 - rarePackRate;
  const cardsPerPack = 5;
  const numSeries = 3;
  const typeKeys = {'crown':'cr', 'three star':'3s', 'two star':'2s', 'one star':'1s', 'rare':'rare', 'four diamond':'4d'};
  const typeEmojis = {'crown':'👑', 'three star':'⭐⭐⭐', 'two star':'⭐⭐', 'one star':'⭐', 'four diamond':'♦♦♦♦', 'rare':'🃏'};
  const rarity = typeKeys[cardType];

  const rates = {
    'norm' : {
      '4th' : {'cr':0.040/100, '3s':0.888/100, '2s': 0.500/100, '1s': 2.572/100, '4d': 1.666/100},
      '5th' : {'cr':0.160/100, '3s':0.222/100, '2s': 2.000/100, '1s':10.288/100, '4d': 6.664/100}
    },
    'rare' : {
      'a1'  : {'cr':3.846/100, '3s':3.846/100, '2s':47.368/100, '1s':42.105/100, '4d': 0.000/100},
      'a1a' : {'cr':5.555/100, '3s':5.555/100, '2s':55.555/100, '1s':33.333/100, '4d': 0.000/100},
      'a2'  : {'cr':5.263/100, '3s':5.263/100, '2s':46.153/100, '1s':46.153/100, '4d': 0.000/100}
    }
  };

  const rate = (cardType === 'rare') ? rarePackRate :
      normalPackRate * (1 - (1 -  rates['norm']['4th'][rarity]) * (1 -  rates['norm']['5th'][rarity])) +
      rarePackRate * (1 - Math.pow(1 - ((rates['rare']['a1'][rarity] +
                                      rates['rare']['a1a'][rarity] +
                                      rates['rare']['a2'][rarity]) / numSeries), cardsPerPack));

  numCardsInput = document.getElementById(`${rarity}Cards`).value;
  const numCards = parseInt(numCardsInput);
  if (isNaN(numCards)) return;

  if (numCards > packsOpened * 5) {
    resultStr += `Valeur improbable pour ${typeEmojis[cardType]}. `;
  } else if (numCards > 1000) {
    resultStr += `Valeur trop élevée pour ${typeEmojis[cardType]}. `;
  } else if (numCards < 0) {
    resultStr += `Veuillez entrer un nombre valide pour ${typeEmojis[cardType]}. `;
  } else {
    const { exactProbability, lessThanProbability } = getProbabilities(packsOpened, numCards, rate);
    const moreThanProbability = 1 - exactProbability - lessThanProbability;
    const atLeastProbability  = 1 - lessThanProbability;

    const packPlural = packsOpened > 1 ? 's' : '';

    resultStr += `Pour ${numCards} ${typeEmojis[cardType]}, ouvertures attendues: <span class="bold-text">${(numCards/rate).toFixed(1)}</span>, `;
    resultStr += `cartes attendues dans ${packsOpened} ouverture${packPlural}: <span class="bold-text">${(packsOpened*rate).toFixed(1)}</span>.<br>`;
    resultStr += `Votre chance pour ${typeEmojis[cardType]} est ${getLuckText(atLeastProbability, moreThanProbability)}.<br>`;
  }
  document.getElementById('individualResults').innerHTML += resultStr + '<br>';
}

function getLuckText(atLeastProbability, moreThanProbability) {
  const goodText = ['<span class="bold-text"><em>plutôt bonne</em></span>',
                    '<span class="bold-text"><em>bien</em></span>',
                    '<span class="bold-text"><em>très bien</em></span>',
                    '<span class="bold-text"><em>incroyable</em></span>'];
  const badText  = ['<span class="bold-text"><em>plutôt mauvaise</em></span>',
                    '<span class="bold-text"><em>mal</em></span>',
                    '<span class="bold-text"><em>très mal</em></span>',
                    '<span class="bold-text"><em>terrible</em></span>'];
  const avgText = '<span class="bold-text"><em>moyenne</em></span>';

  const thresh = [1/Math.E, 0.20, 0.10, 0.05];
  return (atLeastProbability < thresh[3] ? goodText[3] : 
          atLeastProbability < thresh[2] ? goodText[2] :
          atLeastProbability < thresh[1] ? goodText[1] :
          atLeastProbability < thresh[0] ? goodText[0] :
          (atLeastProbability < 1-thresh[0]) || (moreThanProbability < thresh[0]) ? avgText :
          moreThanProbability < 1-thresh[1] ? badText[0] :
          moreThanProbability < 1-thresh[2] ? badText[1] :
          moreThanProbability < 1-thresh[3] ? badText[2] : badText[3]);
}


function getProbabilities(n, k, p) {
  const exactProbability = binomialProbability(n, k, p);
  let lessThanProbability = 0;
  for (let i = 0; i < k; i++) {
    lessThanProbability += binomialProbability(n, i, p);
  }
  return { exactProbability, lessThanProbability };
}

function combination(n, k) {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - (k - i)) / i;
  }
  return result;
}

function binomialProbability(n, k, p) {
  const nChooseK = combination(n, k);
  return nChooseK * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function calculateGlobalLuck() {
  const packsEntry = document.getElementById('packsOpened').value;
  const packsOpened = parseInt(packsEntry) || 0;
  if (packsOpened <= 0 || packsOpened > 10000) {
    document.getElementById('globalLuckResult').innerHTML = 'Veuillez entrer un nombre valide de paquets.';
    return;
  }

  const rarePackRate = 1/2000;
  const normalPackRate = 1 - rarePackRate;
  const cardsPerPack = 5;
  const numSeries = 3;
  const typeKeys = {
    'crown': 'cr', 
    'three star': '3s', 
    'two star': '2s', 
    'one star': '1s', 
    'four diamond': '4d',
    'rare': 'rare'
  };
  const rates = {
    'norm': {
      '4th': {'cr':0.040/100, '3s':0.888/100, '2s': 0.500/100, '1s': 2.572/100, '4d': 1.666/100},
      '5th': {'cr':0.160/100, '3s':0.222/100, '2s': 2.000/100, '1s':10.288/100, '4d': 6.664/100}
    },
    'rare': {
      'a1'  : {'cr':3.846/100, '3s':3.846/100, '2s':47.368/100, '1s':42.105/100, '4d': 0.000/100},
      'a1a' : {'cr':5.555/100, '3s':5.555/100, '2s':55.555/100, '1s':33.333/100, '4d': 0.000/100},
      'a2'  : {'cr':5.263/100, '3s':5.263/100, '2s':46.153/100, '1s':46.153/100, '4d': 0.000/100}
    }
  };

  const cardTypes = ['crown', 'three star', 'two star', 'one star', 'four diamond', 'rare'];
  let globalZSum = 0;
  let count = 0;

  for (let cardType of cardTypes) {
    const rarity = typeKeys[cardType];
    const inputValue = document.getElementById(`${rarity}Cards`).value;
    const observed = parseInt(inputValue);
    if (isNaN(observed)) continue;

    let rate;
    if (cardType === 'rare') {
      rate = rarePackRate;
    } else {
      rate = normalPackRate * (1 - (1 - rates['norm']['4th'][rarity]) *
                              (1 - rates['norm']['5th'][rarity])) +
        rarePackRate * (1 - Math.pow(1 - ((rates['rare']['a1'][rarity] +
                                         rates['rare']['a1a'][rarity] +
                                         rates['rare']['a2'][rarity]) / numSeries), cardsPerPack));
    }

    const expected = packsOpened * rate;
    const variance = packsOpened * rate * (1 - rate);
    const stdDev = Math.sqrt(variance);
    if (stdDev === 0) continue;
    const z = (observed - expected) / stdDev;
    globalZSum += z;
    count++;
  }

  if (count === 0) {
    document.getElementById('globalLuckResult').innerHTML = 'Aucune donnée valide pour le calcul global.';
    return;
  }
  
  const globalZ = (globalZSum / count) -0.76; // ajustement de l'inflation dû au wonder picks et autres en ajout un facteur
  //  négatif -0.76 au z score global, équivalent de 3.8 points en moins à la note finale /20
  let luckDescription;
  if (globalZ >= 1) {
      luckDescription = "exceptionnellement chanceux";
  } else if (globalZ >= 0.5) {
      luckDescription = "très chanceux";
  } else if (globalZ >= 0) {
      luckDescription = "moyennement chanceux";
  } else if (globalZ >= -0.5) {
      luckDescription = "plutôt malchanceux";
  } else if (globalZ >= -1) {
      luckDescription = "très malchanceux";
  } else {
      luckDescription = "exceptionnellement malchanceux";
  }

  let note = 10 + (globalZ * 5);
  note = Math.min(Math.max(note, 0), 20);
  
  document.getElementById('globalLuckResult').innerHTML =
    "Score global de chance (z-score) : <span class='bold-text'>" + globalZ.toFixed(2) + "</span><br>" +
    "Votre note de chance sur 20 : <span class='bold-text'>" + note.toFixed(1) + "/20</span><br>" +
    "Vous êtes " + luckDescription + ".";

    const username = prompt("Entrez votre pseudo pour enregistrer votre score :");
    const globalLuckScore = parseFloat(note.toFixed(1));
    if (username) {
        const details = {
          packsOpened: packsOpened,
          crown: document.getElementById('crCards').value,
          threeStar: document.getElementById('3sCards').value,
          twoStar: document.getElementById('2sCards').value,
          oneStar: document.getElementById('1sCards').value,
          fourDiamond: document.getElementById('4dCards').value,
          rarePacks: document.getElementById('rareCards').value
        };
        saveScore(username, globalLuckScore, details);
        getLeaderboard();
    }
}

async function getLeaderboard() {
  const leaderboardContainer = document.getElementById("leaderboard");
  leaderboardContainer.innerHTML = `
    <h2>
      Classement des Joueurs /20 
      <span class="info-icon">i
        <span class="tooltip-text">
          ● Vous pouvez mettre à jour votre classement en saisissant à nouveau le même nom.<br>
          ● Vous pouvez afficher les détails d'un joueur en cliquant dessus.
        </span>
      </span>
    </h2>`;
  const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(35));
  const querySnapshot = await getDocs(q);

  const medals = ["🥇", "🥈", "🥉"];
  let rank = 0;

  querySnapshot.forEach((doc) => {
      const data = doc.data();
      const entry = document.createElement("p");
      entry.style.cursor = "pointer";
      // Ajout d'un event listener pour afficher les détails du joueur au clic
      entry.addEventListener("click", (e) => showPlayerDetails(doc.id, e));
      const medal = rank < 3 ? medals[rank] : "";
      entry.innerHTML = `<strong>${data.name}</strong>: <span>${data.score}</span> ${medal}`;
      leaderboardContainer.appendChild(entry);
      rank++;
  });
}

async function showPlayerDetails(docId, event) {
  const docRef = doc(db, "scores", docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    const details = data.details;
    const detailsDiv = document.getElementById("playerDetails");

    // Dictionnaire pour les emojis
    const typeEmojis = {
      crown: "👑",
      threeStar: "⭐⭐⭐",
      twoStar: "⭐⭐",
      oneStar: "⭐",
      fourDiamond: "♦♦♦♦",
      rarePacks: "🃏"
    };

    // Construire le contenu du popup
    detailsDiv.innerHTML = `
      <div class="popup-header">
        <h3 class="popup-title">Détails pour ${data.name}</h3>
        <span class="close-btn">&times;</span>
      </div>
      <p>Paquets ouverts : ${details.packsOpened}</p>
      <p>Cartes ${typeEmojis.crown} : ${details.crown}</p>
      <p>Cartes ${typeEmojis.threeStar} : ${details.threeStar}</p>
      <p>Cartes ${typeEmojis.twoStar} : ${details.twoStar}</p>
      <p>Cartes ${typeEmojis.oneStar} : ${details.oneStar}</p>
      <p>Cartes ${typeEmojis.fourDiamond} : ${details.fourDiamond}</p>
      <p>God Packs ${typeEmojis.rarePacks} : ${details.rarePacks}</p>
    `;

    // Récupérer le conteneur du leaderboard (assurez-vous qu'il a position: relative)
    const leaderboardContainer = document.querySelector('.leaderboard-container');

    // Positionner verticalement le popup à partir de l'offsetTop de l'élément cliqué
    detailsDiv.style.top = event.target.offsetTop + "px";
    // Positionner horizontalement le popup à droite du leaderboard
    detailsDiv.style.left = (leaderboardContainer.offsetWidth + 10) + "px";
    detailsDiv.style.display = "block";

    // Ajouter l'événement pour fermer le popup via le bouton
    const closeBtn = detailsDiv.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      detailsDiv.style.display = "none";
    });
  } else {
    console.log("Aucun document trouvé pour cet ID.");
  }
}

// async function adjustScores() { // pas utilisée pour le moment, c'est pour ajuster des scores.
//   try {
//     const scoresRef = collection(db, "scores");
//     const querySnapshot = await getDocs(scoresRef);
//     const updatePromises = [];

//     querySnapshot.forEach((documentSnapshot) => {
//       const data = documentSnapshot.data();
//       const oldScore = data.score;
//       const newScore = parseFloat((oldScore).toFixed(1));
//       console.log(`Mise à jour du document ${documentSnapshot.id} : ${oldScore} -> ${newScore}`);

//       // On prépare la mise à jour de ce document
//       updatePromises.push(
//         updateDoc(doc(db, "scores", documentSnapshot.id), {
//           score: newScore
//         })
//       );
//     });

//     // On attend que toutes les mises à jour soient terminées
//     await Promise.all(updatePromises);
//     console.log("Tous les scores ont été ajustés avec succès.");
//   } catch (error) {
//     console.error("Erreur lors de l'ajustement des scores :", error);
//   }
// }

document.addEventListener("DOMContentLoaded", () => {
  getLeaderboard();
});

window.calculateAllLuck = calculateAllLuck;
