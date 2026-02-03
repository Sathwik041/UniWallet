import React from "react";
import Wallet_Img from "./Img/Wallet_Img.png";
import { Link, useNavigate } from "react-router-dom";


const Navbar=({user,setUser})=>{

    const navigate=useNavigate();

    const handleLogout=()=>{
        localStorage.removeItem("token");
        setUser(null);
        navigate('/');

    }

    return( 
        <nav className="bg-black text-white py-2 ">
            <div className="flex container mx-auto justify-between items-center">
                <div className="flex">
                <img src={Wallet_Img} className="w-30 h-20" />
                <Link to="/" className="my-6 text-xl font-bold  ">UNIWALLET</Link>
                </div>
                <div>
                    {user? (
                        <button onClick={handleLogout} className="bg-gray-500 p-4 rounded-md hover:bg-gray-200 hover:text-black cursor-pointer">Logout</button>
                    ): (
                        <>
                        <Link className="mx-2 hover:underline" to="/Login">Login</Link>
                        <Link className="mx-2 hover:underline" to="/register">Register</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
    
}

export default Navbar;

