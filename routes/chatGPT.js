const express = require("express");
const { USER_TYPES } = require("../constants/chatGPTRoles"); //import constants folder
const {
    isValidRequest, 
    createMessage, 
    postChatGPTMessage,
    addMessageToConversation,
} = require("../utils/chatGPTUtil");

//Create a new router instance
const router = express.Router()

//Create a new post
router.post("/", async (req,res) => {
    //Validate the request body
    if (!isValidRequest(req.body)) {
        return res.status(400).json({ error: "Invalid request"}); 
    }

    //Extract the message and conversation from the request body
    const {message, context, conversation = []} = req.body;  //conversation is an empty array

    //Create context message
    const contextMessage = createMessage(context, USER_TYPES.SYSTEM); //help with organizing the messages
  

    //Add user message to the conversation
    addMessageToConversation(message, conversation, USER_TYPES.USER);

    //Call postChatGPTMessage to get the response from the ChatGPT API
    console.log("Generating response for: /n", message)
    const chatGPTResponse = await postChatGPTMessage(
        contextMessage,
        conversation
    );

    //Check if there was an error with the ChatGPT API
    if (!chatGPTResponse) {
        return res.status(500).json({error: "Error with ChatGPT"}); //if I receive a null
    }

    //Get the content from the ChatGPT response 
    const { content } = chatGPTResponse;

    //Add the ChatGPT response to the conversation 
    addMessageToConversation(content, conversation, USER_TYPES.ASSISTANT); //Assistance = chatGPT

    //Return the conversation as a JSON response 
    console.log("Updated conversation:\n", conversation);
    return res.status(200).json({message: conversation}); //200 status code- everything worked
});




module.exports = router;