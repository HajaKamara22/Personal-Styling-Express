//Require packages and constants 
require("dotenv").config(); //access API keys
const axios = require("axios"); //allow me to make request to chatGPT API
const Yup = require("yup");

//Define constants
const CHATGPT_END_POINT = "https://api.openai.com/v1/chat/completions";
const CHATGPT_MODEL = "gpt-4o";

//Set config for axios request 
const config = {
    headers: {
        Authorization: `Bearer ${process.env.CHATGPT_API_KEY}`,
    },
};

//Function to build a conversation array
const buildConversation = (contextMessage, conversation) => {
    return [contextMessage], concat(conversation)
};

//Function to post a message to the ChatGPT API
const postChatGPTMessage = async (contextMessage, conversation) => {
    const messages = buildConversation(contextMessage, conversation);
    const chatGPTData = {
        model: CHATGPT_MODEL,
        message: messages,
    };

    try {                     //axios will create a post request
        const resp = await axios.post(CHATGPT_END_POINT, chatGPTData, config);
        const data = resp.data;
        const message = data?.choices[0]?.message //Get response message. Grabbing the data, inside the data grabbing the first element from the choices array then grabbing the message
        return message;  //returning the message
    } catch (error) {
        console.error("Error with ChatGPT API"); //Log error message
        console.error(error);
        return null;
    }
};

//Define Yup validation schema for conversation object
const conversationSchema = Yup.object().shape({
    role: Yup.string().required("Role is required"),
    content: Yup.string().required("Content is required"),
});



//Define Yup validation schema for request object
const requestSchema = Yup.object().shape({
    context: Yup.string().required(),  //how the system show be reacting 
    message: Yup.string().required(),   //message from the user
    conversation: Yup.array().of(conversationSchema).notRequired(), //summarizes everything, this is not required 
});



//Function is validate request object using Yup schema
const isValidRequest = (request) => { //validate the context, message, conversation that gets passed in 
    try {
        requestSchema.validateSync(request);
        return true; //return true if it was validSchema
    } catch (error) {
        return false; //return false if it was validSchema
    }
};

const createMessage = (message, role) => { //passing the message and the role
    return {
        role: role,
        content: message
    };
};

//Function to add a message to a conversation array
const addMessageToConversation = (message, conversation, role) => {
    conversation.push(createMessage(message, role));
}


module.exports = {
    isValidRequest,
    addMessageToConversation, 
    postChatGPTMessage,
}; //export so isValidRequest can be used in the chatGPTUti file