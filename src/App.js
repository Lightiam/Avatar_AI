import React, { useState, useEffect, useRef, useReducer } from 'react';
import {
  ChakraProvider,
  Box,
  Text,
  VStack,
  Input,
  Button,
  Flex,
  theme,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Progress,
  Image,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { FaSmile, FaSadTear, FaMeh, FaAngry, FaSurprise, FaMicrophone, FaStop, FaVideo, FaVideoSlash } from 'react-icons/fa';
import io from 'socket.io-client';
import axios from 'axios';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as AvatarSDKModule from 'avatar-sdk/xrsavatar.js';
import Peer from 'simple-peer';

const { AvatarSDK } = AvatarSDKModule;

// Reducer function for state management
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'ADD_CONVERSATION':
      return { ...state, conversation: [...state.conversation, action.payload] };
    case 'SET_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_AVATAR_EMOTION':
      return { ...state, avatarEmotion: action.payload };
    case 'SET_MODAL_OPEN':
      return { ...state, isModalOpen: action.payload };
    case 'SET_TIMER':
      return { ...state, timer: action.payload };
    case 'SET_LOCAL_STREAM':
      return { ...state, localStream: action.payload };
    case 'SET_REMOTE_STREAM':
      return { ...state, remoteStream: action.payload };
    case 'SET_PEER':
      return { ...state, peer: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_AUTH_TOKEN':
      return { ...state, authToken: action.payload };
    default:
      return state;
  }
};

// Simple tokenizer function
const simpleTokenizer = (text) => text.toLowerCase().match(/\b(\w+)\b/g) || [];

// Web Speech API utility functions
const createSpeechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return new SpeechRecognition();
};

const createSpeechSynthesis = () => {
  return window.speechSynthesis;
};

const ConversationalAIAvatar = () => {
  const initialState = {
    message: '',
    conversation: [],
    isListening: false,
    avatarEmotion: 'neutral',
    isModalOpen: false,
    timer: 0,
    localStream: null,
    remoteStream: null,
    peer: null,
    error: null,
    user: null,
    authToken: null,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const socketRef = useRef();
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const avatarRef = useRef(null);
  const toast = useToast();

  const handleLogin = async () => {
    try {
      const response = await axios.post('/api/login', { username, password });
      dispatch({ type: 'SET_AUTH_TOKEN', payload: response.data.token });
      dispatch({ type: 'SET_USER', payload: username });
      toast({
        title: "Login Successful",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.response?.data?.error || "An error occurred",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post('/api/register', { username, password });
      toast({
        title: "Registration Successful",
        description: "You can now log in",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsRegistering(false);
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error.response?.data?.error || "An error occurred",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const emotions = {
    happy: { icon: FaSmile, color: 'yellow.400', expression: '😊' },
    sad: { icon: FaSadTear, color: 'blue.400', expression: '😢' },
    neutral: { icon: FaMeh, color: 'gray.400', expression: '😐' },
    angry: { icon: FaAngry, color: 'red.400', expression: '😠' },
    surprised: { icon: FaSurprise, color: 'purple.400', expression: '😲' },
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prevTimer) => prevTimer + 1);
    }, 1000);

    // Initialize WebSocket connection
    const secureServerUrl = process.env.REACT_APP_SECURE_SERVER_URL || 'wss://pally-bot-ai-server.herokuapp.com';
    socketRef.current = io(secureServerUrl);

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRec = new SpeechRecognition();
    speechRec.continuous = true;
    speechRec.interimResults = true;

    speechRec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      handleSendMessage(transcript);
    };

    recognitionRef.current = speechRec;

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;

    // Initialize Avatar SDK
    avatarRef.current = new AvatarSDK({
      container: document.getElementById('avatar-container'),
      model: 'default-avatar-model',
      webgl: {
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: false,
        premultipliedAlpha: true,
        stencil: false
      }
    });

    // Initialize WebRTC
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);

        const peer = new Peer({ initiator: true, trickle: false, stream });
        setPeer(peer);

        peer.on('signal', (data) => {
          socketRef.current.emit('offer', data);
        });

        peer.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
        });

        socketRef.current.on('answer', (answer) => {
          peer.signal(answer);
        });

        socketRef.current.on('ice-candidate', (candidate) => {
          peer.addIceCandidate(candidate);
        });
      } catch (error) {
        console.error('Error initializing WebRTC:', error);
      }
    };

    initWebRTC();

    return () => {
      clearInterval(interval);
      socketRef.current.disconnect();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      if (avatarRef.current) {
        avatarRef.current.dispose(); // Clean up Avatar SDK
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peer) {
        peer.destroy();
      }
    };
  }, []);

  const handleSendMessage = async (text) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // Send message to backend for processing
      const response = await axios.post('/api/process-input', { message: text });

      // Simple tokenization function
      const simpleTokenize = (str) => str.toLowerCase().split(/\W+/).filter(token => token.length > 0);
      const nlpResponse = simpleTokenize(response.data.message).join(' ');

      // Update conversation state
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: { user: text, ai: nlpResponse }
      });

      // Trigger Text-to-Speech
      speakResponse(nlpResponse);

      // Update avatar emotion
      const newEmotion = response.data.emotion || 'neutral';
      dispatch({ type: 'SET_AVATAR_EMOTION', payload: newEmotion });
    } catch (error) {
      console.error("Error processing input:", error);
      dispatch({ type: 'SET_ERROR', payload: 'An error occurred while processing your input.' });
      toast({
        title: "Error",
        description: "An error occurred while processing your input.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const speakResponse = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    synthesisRef.current.speak(utterance);
  };

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      recognitionRef.current.start();
    } else {
      recognitionRef.current.stop();
    }
  };

  const handleUserInput = (event) => {
    setMessage(event.target.value);
  };

  const showConversationSummary = () => {
    setIsModalOpen(true);
  };

  const generateConversationSummary = () => {
    if (conversation.length === 0) {
      return {
        dominantEmotion: 'N/A',
        topics: [],
        messageCount: 0,
      };
    }

    const emotionCounts = conversation.reduce((acc, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {});

    const dominantEmotion = Object.entries(emotionCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Simple topic extraction (keywords)
    const extractTopics = (text) => {
      const words = text.toLowerCase().split(/\W+/);
      const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
      return words.filter(word => word.length > 3 && !commonWords.has(word));
    };

    const topics = [...new Set(conversation.flatMap(entry => extractTopics(entry.user)))];

    return {
      dominantEmotion,
      topics,
      messageCount: conversation.length,
    };
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
      const newPeer = new Peer({ initiator: true, trickle: false, stream });
      dispatch({ type: 'SET_PEER', payload: newPeer });

      newPeer.on('signal', (data) => {
        socketRef.current.emit('offer', data);
      });

      newPeer.on('stream', (remoteStream) => {
        dispatch({ type: 'SET_REMOTE_STREAM', payload: remoteStream });
      });

      socketRef.current.on('answer', (answer) => {
        newPeer.signal(answer);
      });
    } catch (error) {
      console.error('Error starting video call:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start video call' });
      toast({
        title: "Error",
        description: "Failed to start video call. Please check your camera and microphone permissions.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const endVideoCall = () => {
    try {
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
      if (state.remoteStream) {
        state.remoteStream.getTracks().forEach(track => track.stop());
      }
      if (state.peer) {
        state.peer.destroy();
      }
      dispatch({ type: 'END_VIDEO_CALL' });
    } catch (error) {
      console.error('Error ending video call:', error);
      toast({
        title: "Error",
        description: "Failed to end video call properly. Please refresh the page.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box textAlign="center" fontSize="xl" p={5}>
        <VStack spacing={8}>
          <Text fontSize="2xl" fontWeight="bold">Conversational AI Avatar</Text>
          <Box width="320px" height="240px" id="avatar-container">
            {/* Avatar SDK will render here */}
          </Box>
          <VStack width="100%" maxHeight="300px" overflowY="auto" spacing={4} align="stretch">
            {conversation.map((entry, index) => (
              <Box key={index} textAlign={index % 2 === 0 ? 'right' : 'left'}>
                <Text fontWeight="bold">{index % 2 === 0 ? 'You' : 'AI'}:</Text>
                <Text>{entry.user || entry.ai}</Text>
              </Box>
            ))}
            <div ref={chatEndRef} />
          </VStack>
          <Flex width="100%">
            <Input
              value={message}
              onChange={handleUserInput}
              placeholder="Type your message..."
              mr={2}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(message)}
            />
            <Button onClick={() => handleSendMessage(message)} colorScheme="blue">Send</Button>
          </Flex>
          <Flex justify="center" mt={4}>
            <Button
              onClick={toggleListening}
              colorScheme={isListening ? "red" : "green"}
              leftIcon={isListening ? <FaStop /> : <FaMicrophone />}
            >
              {isListening ? "Stop Listening" : "Start Listening"}
            </Button>
          </Flex>
          {isListening && <Text mt={2}>Listening...</Text>}
          <Flex wrap="wrap" justify="center">
            {Object.entries(emotions).map(([emotion, { icon: Icon, color }]) => (
              <Button
                key={emotion}
                leftIcon={<Icon />}
                onClick={() => setAvatarEmotion(emotion)}
                m={1}
                colorScheme={color.split('.')[0]}
              >
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </Button>
            ))}
          </Flex>
          <Button onClick={showConversationSummary} colorScheme="teal">
            Show Conversation Summary
          </Button>
          <Text>Timer: {formatTime(timer)}</Text>
          <Flex justify="center" mt={4}>
            <Button
              onClick={startVideoCall}
              colorScheme="green"
              mr={2}
            >
              Start Video Call
            </Button>
            <Button
              onClick={endVideoCall}
              colorScheme="red"
            >
              End Video Call
            </Button>
          </Flex>
          {localStream && (
            <Box mt={4}>
              <Text>Local Stream</Text>
              <video
                ref={(video) => {
                  if (video) video.srcObject = localStream;
                }}
                autoPlay
                muted
                playsInline
                style={{ width: '320px', height: '240px' }}
              />
            </Box>
          )}
          {remoteStream && (
            <Box mt={4}>
              <Text>Remote Stream</Text>
              <video
                ref={(video) => {
                  if (video) video.srcObject = remoteStream;
                }}
                autoPlay
                playsInline
                style={{ width: '320px', height: '240px' }}
              />
            </Box>
          )}
        </VStack>
      </Box>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Conversation Summary</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {(() => {
              const summary = generateConversationSummary();
              return (
                <VStack align="stretch" spacing={4}>
                  <Text>Messages exchanged: {summary.messageCount}</Text>
                  <Text>Dominant emotion: {summary.dominantEmotion}</Text>
                  <Text>Topics discussed: {summary.topics.join(', ') || 'None identified'}</Text>
                  <Text fontWeight="bold">Emotion Distribution:</Text>
                  {Object.entries(emotions).map(([emotion, { color }]) => (
                    <Flex key={emotion} align="center">
                      <Text width="100px">{emotion}:</Text>
                      <Progress
                        flexGrow={1}
                        value={(conversation.filter(entry => entry.emotion === emotion).length / summary.messageCount) * 100}
                        colorScheme={color.split('.')[0]}
                      />
                    </Flex>
                  ))}
                </VStack>
              );
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
};

export default ConversationalAIAvatar;
