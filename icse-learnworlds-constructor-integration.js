import * as proctoring from 'https://sdk.app.proctor.alemira.com/proctoring.js';

let sessionId;
let lmsData = window.lmsData || {};

const swapIcseButtonWithLMSButton = () => {
  const lmsButton = document.getElementById('lms-start-button');
  const icseButton = document.getElementById('icse-proctored-button');
  lmsButton.style.display = 'block';
  icseButton.style.display = 'none';
};

const getExamName = () => {
  const h1 = document.getElementsByTagName('h1')[0];
  if (h1) {
    return h1.textContent;
  }
}

const getSessionUrl = () => {
  return window.location.href;
}
  
const startProctoring = async () => {
  const postData = {
    "accountId": lmsData.schoolName,
    "accountName": lmsData.schoolName,
    "duration": 100,
    "email": lmsData.userEmail,
    "examId": lmsData.examId,
    "examName": `${lmsData.courseId}-exam`,
    "proctoring": "offline",
    "schedule": false,
    "sessionUrl": getSessionUrl(),
    "userId": lmsData.userId,
    "userName": lmsData.userName,
  };

  console.log("PROCTORING POST DATA: ", postData);

  const response = await fetch("https://first-worker.devin-zimmer.workers.dev/t", {
    method: "POST",
    body: JSON.stringify(postData),
  })

  const body = await response.json();
  const jwt = body.token;
  sessionId = body.sessionId;

  const serverOrigin = "https://demo.proctor.constructor.app";
  const integrationName = "ICSE";
  const theme = 'default';
  const config = {};
  const proctoringSession = await proctoring
        .init({serverOrigin, integrationName, jwt, theme, ...config})
        .catch(e => console.log(`Proctoring SDK Init Error: ${e.message} ${e.cause}`))
          console.log("proctoring session data: ", proctoringSession);
          proctoringSession.examStarted
            .then(() => {
              console.log('proctoring: exam started')
              swapIcseButtonWithLMSButton();
            })
      
          proctoringSession.examFinished
            .then(() => {
              console.log('proctoring: exam ended');
              const frameBody = document.getElementsByTagName('BODY')[0].childNodes[1];
              if (frameBody) {
                frameBody.style.display = 'none';
              }
            })
      
          proctoringSession.videoUploaded
            .then(() => {
              console.log('proctoring: video uploaded')
              const proctoringCompleteFrame = document.getElementById("proctoring-root-element");

              // HIDE PROCTOR IFRAME AND REVEAL LMS IFRAME
              // if (proctoringCompleteFrame) {
              //   proctoringCompleteFrame.style.display = 'none';
              // }

              // const frameBody = document.getElementsByTagName('BODY')[0].childNodes[1];
              // if (frameBody) {
              //   frameBody.style.display = 'block';
              // }
            })
}

const swapLMSButtonWithIcseButton = (node) => {
  node.id = "lms-start-button";
  const parent = node.parentElement;
  const clone = node.cloneNode();
  clone.id = 'icse-proctored-button';
  clone.textContent = "Start Proctoring";
  clone.style.backgroundColor = '#3c027c';

  clone.addEventListener('click', () => {
    console.log("START PROCTORING!");
    startProctoring();
    clone.disabled = true;
    clone.style.backgroundColor = '#6e627b';
  });

  node.style.display = 'none';

  parent.appendChild(clone);
}

const sendFinishedExamSignal = async () => {
  const response = await fetch("https://first-worker.devin-zimmer.workers.dev/f", {
    method: "POST",
    body: JSON.stringify({
      "sessionId": sessionId,
    }),
  })
  const body = await response.json();
  console.log("FINISHED EXAM SIGNAL RESPONSE: ", body);
}

const observeStartButtonAddition = async () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.textContent.trim() == 'Begin Proctored Exam') {
          swapLMSButtonWithIcseButton(node);
        }
        if (node.textContent.match(/your results/)){
          sendFinishedExamSignal();
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
observeStartButtonAddition();