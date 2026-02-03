import { BrowserRouter as Router
    ,Routes,Route,Navigate } from "react-router-dom";
import  Navbar  from "./Components/Navbar.jsx";
import {Home} from "./Pages/Home"
import { Login } from "./Pages/Login";
import { Register } from "./Pages/Register";
import { useEffect, useState } from "react";
import axios from "axios";




const UserLogin=()=>{
    const [user,setUser]=useState(null);
    const [error,setError]=useState('');
    const [isLoading,setLoading]=useState(true);


    useEffect(()=>{
        const fetchUser=async ()=>{
            const token=localStorage.getItem("token");
        
        if(token){
            try{
                const res= await axios.get('/api/users/me',{
                    headers:{Authorization: `Bearer ${token}`}
                })
                setUser(res.data)
            }catch(err){
                setError("Failed to fetch User data");
                localStorage.removeItem("token");

            }
        }
        setLoading(false);
    };
        fetchUser();

    },[]);

    if(isLoading){
        return(
            <div className="min-h-screen flex justify-center items-center bg-black bg-opacity-50 text-white text-2xl">
                     Loading...
            </div>
        )
    }



    return (
        
            <Router>
            <Navbar user={user} setUser={setUser} />
            <Routes>
                <Route path="/" element={<Home user={user} error={error} />}/>
                <Route path="/login" element={user ? <Navigate to='/' /> : <Login setUser={setUser} />} />
                <Route path="/Register" element={user ? <Navigate to='/' /> :<Register setUser={setUser} />} />
            </Routes>
            </Router>
        
    );
    
}

export default UserLogin;