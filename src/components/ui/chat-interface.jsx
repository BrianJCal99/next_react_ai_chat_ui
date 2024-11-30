"use client" 

import { useState, useEffect, useRef } from 'react';

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function ChatInterface() {
  const [info, setInfo] = useState(''); // State for the input info
  const [messages, setMessages] = useState([]); // State for the conversation history
  const messagesEndRef = useRef(null); // Ref for scrolling

  // Fetch chat history on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/history');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMessages(data.history); // Set the initial messages from the database
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchHistory();
  }, []);

  // Scroll to the bottom of the messages container whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent the default form submission

    // Prevent submission of empty input
    if (!info.trim()) {
      console.log("Input cannot be empty.")
      return; // Exit the function if input is empty
    }

    const userMessage = { role: "user", content: info };
    setMessages((prev) => [...prev, userMessage]); // Add user's message to history

    try {
      const response = await fetch('http://localhost:4000/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ info }), // Send the info from the input
      });

      // Check if the response is okay
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response from server:", data); // Debugging: Log server response

      // Ensure data.response exists and is a string
      if (data.response && typeof data.response === "string") {
        const assistantMessage = { role: "assistant", content: data.response };
        setMessages((prev) => [...prev, assistantMessage]); // Add assistant's message to history
      } else {
        console.error("Invalid response structure:", data); // Debugging: Log if response structure is invalid
      }

      setInfo(''); // Clear the input field after sending
    } catch (error) {
      console.error('Error sending data:', error);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_auto] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 font-[family-name:var(--font-geist-sans)]">
    <div className="fixed top-0 left-0 right-0 p-4 bg-white">
      <h1 className="text-3xl font-bold text-center text-gray-900 mt-8 mb-4">Chat with llama3</h1>
    </div>
    <main className="flex flex-col gap-4 row-start-2 w-full">
    {messages.length === 0 && (
      <p className="text-center text-xl text-gray-500">What can I help with?</p>
    )}
    <div className='p-6 pt-0'>
      {messages.map((msg, index) => (
        <div key={index} className="space-y-4 p-4">
          <div 
            className={`
              flex w-full flex-col gap-2 rounded-lg px-6 py-4 text-md mx-auto
              ${
                msg.role === "user" ? "max-w-[70%] mr-auto bg-primary text-primary-foreground text-right" : "max-w-[70%] ml-auto bg-muted"
              }`
            }
            dangerouslySetInnerHTML={{ __html: msg.content }}
            //style={{width: 'auto'}}
            // style={{ whiteSpace: msg.role === "user" ? "normal" : "pre-wrap" }}
            >
          </div>
        </div>
      ))}
    </div>
    <div ref={messagesEndRef} />
    </main>
    <form onSubmit={handleSubmit} className="fixed bottom-0 left-0 right-0 p-8 bg-white flex justify-center items-center">
        <div className="flex gap-2 items-center flex-col sm:flex-row w-full justify-center">
          <Textarea className="w-full min-h-[40px] max-w-[720px] shadow-sm resize-none"
            type="text"
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Ask me anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevents adding a new line
                handleSubmit(e); // Triggers the submit function
              }
            }}
          />
          <button 
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-14 w-14" 
            type="submit">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M1.20308 1.04312C1.00481 0.954998 0.772341 1.0048 0.627577 1.16641C0.482813 1.32802 0.458794 1.56455 0.568117 1.75196L3.92115 7.50002L0.568117 13.2481C0.458794 13.4355 0.482813 13.672 0.627577 13.8336C0.772341 13.9952 1.00481 14.045 1.20308 13.9569L14.7031 7.95693C14.8836 7.87668 15 7.69762 15 7.50002C15 7.30243 14.8836 7.12337 14.7031 7.04312L1.20308 1.04312ZM4.84553 7.10002L2.21234 2.586L13.2689 7.50002L2.21234 12.414L4.84552 7.90002H9C9.22092 7.90002 9.4 7.72094 9.4 7.50002C9.4 7.27911 9.22092 7.10002 9 7.10002H4.84553Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg><span className="sr-only">Send</span></button>
        </div>
      </form>
  </div>
  );
}
