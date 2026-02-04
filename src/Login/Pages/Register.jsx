import React, { useState } from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";

export const Register=({setUser})=>{
    const [error,setError]=useState('');
    const [formData,setFormData]=useState({
        username:"",
        email:"",
        password:"",
    });
    const navigate=useNavigate();

    const handleChange=(e)=>{
        setFormData({...formData,[e.target.name]:e.target.value})
    }

    const handleSubmit=async (e) =>{
        e.preventDefault();
        try{
            const res=await api.post("/register",formData);
            localStorage.setItem("token",res.data.token);
            localStorage.removeItem("uniwallet_vault");
            setUser(res.data);
            navigate('/');
        }catch(err){
            setError(err.response?.data?.message || "Registration Failed");

        }
    }

    return(
        <div className="min-h-screen flex justify-center items-center bg-black bg-opacity-50 text-white p-4">
            <div className="bg-black p-6 md:p-8 rounded-lg shadow-lg w-full max-w-md border border-white">
                <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
                {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                <form onSubmit={handleSubmit} >
                    <div>
                        <label className="block text-gray-300 text-md  mb-3">Username</label>
                        <input type="username" className="w-full bg-gray-300 text-black border border-gray-500 p-3 rounded-md focus:ring-3 focus:ring-gray-500 outline-none focus:border-gray-500"
                          placeholder="Enter your Username" 
                          name="username" value={formData.username} onChange={handleChange} autoComplete="off" required />
                   </div>
                    

                    <div>
                        <label className="block text-gray-300 text-md mt-3 mb-3">Email</label>
                        <input type="email" className="w-full bg-gray-300 text-black border border-gray-500 p-3 rounded-md focus:ring-3 focus:ring-gray-500 outline-none focus:border-gray-500"
                          placeholder="Enter your Email" 
                          name="email" value={formData.email} onChange={handleChange} autoComplete="off" required />
                   </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-300 text-md mb-3 mu-3 mt-3">Password</label>
                        <input type="password" className="w-full bg-gray-300 text-black border border-gray-500 p-3 rounded-md focus:ring-3 focus:ring-gray-500 outline-none focus:border-gray-500"
                        placeholder="Enter your Password"
                        name="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <button className="w-full bg-white text-black p-3 rounded-md hover:bg-gray-500 font-medium cursor-pointer">Register</button>
                </form>
            </div>  
        </div>
    );
}


