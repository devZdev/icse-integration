import * as proctoring from 'https://sdk.app.proctor.alemira.com/proctoring.js'

(function(window) {
  const lmsData = window.lmsData || {}
  const proctorButton = (() => {
    const button = document.createElement('button')
    button.id = 'icse-proctored-button'
    button.classList.add("learnworlds-button", "learnworlds-element", "learnworlds-button-normal", "learnworlds-button-solid-brand")
    button.style.backgroundColor = "#3c027c"
    button.style.display = "none"
    button.textContent = "Start Proctoring"
    button.addEventListener('click', () => {
      startProctoring()
      button.disabled = true
      button.style.backgroundColor = '#6e627b'
    });
    return button
  })()
  let sessionId
  let lmsButton

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
      "sessionUrl": window.location.href,
      "userId": lmsData.userId,
      "userName": lmsData.userName,
    };

    const airlog = async (json) => {
      console.log(json)
      await fetch("https://first-worker.devin-zimmer.workers.dev/l", {
        method: "POST",
        body: JSON.stringify(json),
      })
    }

	  const firstLog = { message: "PROCTORING JWT PARAMETERS", data: postData }
	  airlog(firstLog);

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
          .catch(e => {
            const message = `Proctoring SDK Init Error: ${e.message} ${e.cause}`
            const errorJson = { message: message }
            airlog(errorJson)
          })
            
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
