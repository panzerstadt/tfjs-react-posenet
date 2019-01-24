import * as emailjs from "emailjs-com";

const TEMPLATE_ID = "posenet";
const SERVICE_ID = "default_service";
const USER_ID = "user_ljTfIJFviZGfuGmui594C";

const template_params = {
  subject: "subject_value",
  message: "message_value",
  from: "from_value"
};

export const sendEmail = async ({ subject, message, from }) => {
  const data = { subject, message, from };

  return new Promise(resolve => {
    emailjs
      .send(SERVICE_ID, TEMPLATE_ID, data || template_params, USER_ID)
      .then(
        response => {
          console.log("SUCCESS!", response.status, response.text);
          resolve(true);
        },
        err => {
          console.log("FAILED...", err);
          resolve(false);
        }
      );
  });
};

export const sendEmailWithAttachment = async ({ event }) => {
  console.log(event);
};
