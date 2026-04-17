import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function GoToTopButton({
  showAfter = 500,
  bottom = 24,
  right = 24,
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > showAfter);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [showAfter]);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        .go-to-top-btn {
          position: fixed;
          z-index: 60;
          border: none;
          cursor: pointer;
          width: 54px;
          height: 54px;
          border-radius: 999px;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.26);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
          opacity: 0.96;
        }

        .go-to-top-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.32);
        }

        .go-to-top-btn:active {
          transform: translateY(0);
        }

        @media (max-width: 700px) {
          .go-to-top-btn {
            width: 50px;
            height: 50px;
          }
        }

        @media print {
          .go-to-top-btn {
            display: none !important;
          }
        }
      `}</style>

      <button
        type="button"
        className="go-to-top-btn"
        onClick={handleClick}
        aria-label="Go to top"
        title="Go to top"
        style={{ bottom, right }}
      >
        <ArrowUp size={22} />
      </button>
    </>
  );
}