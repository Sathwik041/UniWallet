import useToastStore from "../../store/toaststore";

export default function Toast() {
    const { visible, message } = useToastStore();

    if (!visible) return null;

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex justify-center px-4 py-3 text-white bg-green-600 rounded-lg shadow-lg">
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}