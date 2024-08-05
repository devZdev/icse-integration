
import * as proctoring from 'https://sdk.app.proctor.alemira.com/proctoring.js'

(function(window) {

  let sessionId
  let lmsButton

  const proctorButton = (() => 
    Object.assign(document.createElement('button'), {
      id: 'icse-proctored-button',
      textContent: 'Start Proctoring',
      onclick: () => {
        startProctoring();
        proctorButton.disabled = true;
        proctorButton.style.backgroundColor = '#6e627b';
      },
      style: {
        backgroundColor: '#3c027c',
        display: 'none'
      }
    }).classList.add(
      'learnworlds-button',
      'learnworlds-element',
      'learnworlds-button-normal',
      'learnworlds-button-solid-brand'
    )
  )()
    
  const startProctoring = async () => {
    const lmsData = window.lmsData || {}
    const postData = {
      "accountId": lmsData.schoolName,
      "accountName": lmsData.schoolName,
      "duration": 100,
      "email": lmsData.userEmail,
      "examId": lmsData.examId,
      "examName": `${lmsData.courseId}-exam`,
      "proctoring": "offline",
      "schedule": false,
      "sessionUrl": window.location.href,
      "userId": lmsData.userId,
      "userName": lmsData.userName,
    };

    const response = await fetch("https://first-worker.devin-zimmer.workers.dev/t", {
      method: "POST",
      body: JSON.stringify(postData),
    })

    const body = await response.json();
    const jwt = body.token;
    sessionId = body.sessionId;
    const serverOrigin = "https://demo.proctor.constructor.app"
    const integrationName = "ICSE"
    const theme = 'default'
    const config = {};

    const proctoringSession = await proctoring
          .init({serverOrigin, integrationName, jwt, theme, ...config})
          .catch(e => console.log(`Proctoring SDK Init Error: ${e.message} ${e.cause}`))
            
    proctoringSession.examStarted
      .then(() => {
        console.log('PROCTORING: EXAM STARTED')
        hideNode(proctorButton);
        showNode(lmsButton);
      })

    proctoringSession.examFinished
      .then(() => {
        console.log('PROCTORING: EXAM ENDED')
        hideLMSContent();
      })

    proctoringSession.videoUploaded
      .then(() => console.log('PROCTORING: VIDEO UPLOADED'))
  }

  const hideLMSContent = () => {
    const frameBody = document.getElementsByTagName('BODY')[0].childNodes[1]
    if (frameBody) {
      frameBody.style.display = 'none';
    }
  }

  const sendFinishedExamSignal = async () => {
    const response = await fetch("https://first-worker.devin-zimmer.workers.dev/f", {
      method: "POST",
      body: JSON.stringify({
        "sessionId": sessionId,
      }),
    })
    const body = await response.json();
    console.log("FINISHED EXAM SIGNAL RESPONSE: ", body)
  }

  const observeStartButtonAddition = async () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.textContent.trim() == 'Begin Proctored Exam') {
            node.parentElement.appendChild(proctorButton)
            lmsButton = node
            hideNode(lmsButton)
            showNode(proctorButton)
          }
          if (node.textContent.match(/your results/)){
            sendFinishedExamSignal()
            observer.disconnect()
          }
        })
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  const hideNode = (node) => {
    node.style.display = 'none'
  }

  const showNode = (node) => {
    node.style.display = 'block'
  }

  observeStartButtonAddition()

})(window);