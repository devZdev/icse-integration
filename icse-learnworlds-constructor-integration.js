
import * as proctoring from 'https://sdk.app.proctor.alemira.com/proctoring.js'

(async function(window) {

  let jwt
  let sessionId
  let lmsButton

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

  const startProctoring = async () => {
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

  /*
  * Our strategy is to key off certain UI elements rendering on the page
  * that signal the start and end of the exam. We attach procorting handlers to these events
  */
  const handleProctoringLifecycle = async () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          /*
          * This informs us that the LMS start button is on the page.
          * Toggle visibility with our proctoring button
          */
          if (node.textContent.trim() == 'Begin Proctored Exam') {
            node.parentElement.appendChild(proctorButton)
            lmsButton = node
            hideNode(lmsButton)
            showNode(proctorButton)
          }

          /*
          * This informs us that the exam has been submitted
          * Let the Proctoring service know the exam is over.
          */
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

  const getSessionData = async () => {
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
    const token = body.token;
    const sid = body.sessionId;
    return { token, sid }
  }

  const { token, sid } = await getSessionData();
  jwt = token
  sessionId = sid
  handleProctoringLifecycle()

})(window);