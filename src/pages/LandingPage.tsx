import { useState, useEffect, FormEvent, useRef } from "react";
import logoLight from "../assets/images/logo-light.png";
import logoDark from "../assets/images/Logo-dark.png";
import logoIconDark from "../assets/images/logo-icon-dark.png";
import logoIconLight from "../assets/images/logo-icon-light.png";
import mechanic1 from "../assets/images/mechanic1.jpg";
import mechanic2 from "../assets/images/mechanic2.jpg";
import mechanic3 from "../assets/images/mechanic3.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { apiService } from "../utils/api";
import {
  getStoredLanguage,
  setStoredLanguage,
  useTranslations,
  type Language,
} from "../utils/i18n";
import { getCarMakes, getCarModels, generateYears } from "../data/carDatabase";
import { useToast } from "../contexts/ToastContext";
import ContactModal from "../components/ContactModal";
import ProModal from "../components/ProModal";
import ProWizard from "../components/ProWizard";
import SearchableSelect from "../components/SearchableSelect";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [language, setLanguage] = useState<Language>(getStoredLanguage());
  const t = useTranslations(language);
  const { showToast } = useToast();

  // Theme toggle
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark") || "light",
  );
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ppe_theme", next);
  };

  // Get referral code from URL parameter
  const referralCodeFromUrl = searchParams.get("ref") || null;

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carModelOther, setCarModelOther] = useState("");

  // Derive showModelOther directly from state values for instant updates
  const showModelOther = carMake === "Other" || carModel === "Other";
  const [savedVehicle, setSavedVehicle] = useState<{
    year: string;
    model: string;
  } | null>(null);

  // Modal state
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isProOpen, setIsProOpen] = useState(false);
  const [isProSuccessOpen, setIsProSuccessOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [storedBizName, setStoredBizName] = useState("");
  const [storedProviderEmail, setStoredProviderEmail] = useState("");

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [duplicateEmailError, setDuplicateEmailError] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);

  // Modal refs
  const proSuccessDialogRef = useRef<HTMLDialogElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);
  // GSAP refs
  const headerRef = useRef<HTMLElement>(null);
  const heroLine1Ref = useRef<HTMLSpanElement>(null);
  const heroLine2Ref = useRef<HTMLSpanElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setStoredLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  // Countdown timer for auto-navigation
  useEffect(() => {
    if (currentStep === 3 && statusUrl && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(statusUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentStep, statusUrl, countdown, navigate]);

  // Mobile sticky CTA: show when form scrolls out of view
  const [mobileStickyVisible, setMobileStickyVisible] = useState(false);
  useEffect(() => {
    const el = formContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMobileStickyVisible(!entry.isIntersecting),
      { threshold: 0.1, rootMargin: "0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollToForm = () => {
    formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // GSAP: hero timeline + scroll-triggered animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(headerRef.current, { duration: 0.6, y: -24, opacity: 0 })
        .from(
          heroLine1Ref.current,
          { duration: 0.7, y: 36, opacity: 0 },
          "-=0.3",
        )
        .from(
          heroLine2Ref.current,
          { duration: 0.7, y: 36, opacity: 0 },
          "-=0.5",
        )
        .from(
          subtitleRef.current,
          { duration: 0.6, y: 28, opacity: 0 },
          "-=0.4",
        )
        .from(
          formContainerRef.current,
          { duration: 0.8, y: 48, opacity: 0 },
          "-=0.35",
        );

      ScrollTrigger.create({
        trigger: previewRef.current,
        start: "top 85%",
        onEnter: () => {
          gsap.from(previewRef.current, {
            duration: 0.9,
            y: 50,
            opacity: 0,
            ease: "power3.out",
          });
        },
        once: true,
      });

      ScrollTrigger.create({
        trigger: featuresRef.current,
        start: "top 82%",
        onEnter: () => {
          const title = featuresRef.current?.querySelector(".features-title");
          const items = featuresRef.current?.querySelectorAll(".feature-item");
          const tl2 = gsap.timeline({ defaults: { ease: "power3.out" } });
          if (title) tl2.from(title, { duration: 0.5, y: 24, opacity: 0 });
          if (items?.length)
            tl2.from(
              items,
              {
                duration: 0.6,
                y: 40,
                opacity: 0,
                stagger: 0.12,
                clearProps: "transform,opacity",
              },
              "-=0.2",
            );
        },
        once: true,
      });
    });
    return () => ctx.revert();
  }, []);

  // Track referral click when page loads with referral code (only once)
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (referralCodeFromUrl && !hasTrackedRef.current) {
      hasTrackedRef.current = true;
      // Track the referral click (don't wait for it, fire and forget)
      apiService
        .trackReferralClick({ referral_code: referralCodeFromUrl })
        .catch((error) => {
          // Silently fail - tracking is not critical
          console.error("Failed to track referral click:", error);
        });
    }
  }, [referralCodeFromUrl]);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "fr" : "en";
    setLanguage(newLang);
  };

  const updateProgress = (step: number) => {
    setCurrentStep(step);
  };

  // Step 1: Vehicle selection - show checking state for 2s then move to step 2
  const handleVehicleCheck = (e: FormEvent) => {
    e.preventDefault();

    let finalModel = carModel;
    if (showModelOther && carModelOther.trim() !== "") {
      finalModel = carModelOther.trim();
    }

    if (!carYear || !carMake || !finalModel) {
      showToast(
        language === "en"
          ? "Please select all vehicle details."
          : "Veuillez sélectionner tous les détails du véhicule.",
        "error",
      );
      return;
    }

    setIsCheckingAvailability(true);
    setTimeout(() => {
      setIsCheckingAvailability(false);
      setCurrentStep(2);
      updateProgress(2);
    }, 2000);
  };

  // Step 2: Email submission - does the actual API call
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (localStorage.getItem("ppe_joined_email") === email) {
      setDuplicateEmailError(true);
      return;
    }

    setDuplicateEmailError(false);
    setIsProcessing(true);

    try {
      let finalModel = carModel;
      if (showModelOther && carModelOther.trim() !== "") {
        finalModel = carModelOther.trim();
      }

      const fullCarName = `${carMake} ${finalModel}`;
      const result = await apiService.signupWaitlist({
        email,
        name: email.split("@")[0], // Use email prefix as name if not provided
        vehicle_year: parseInt(carYear, 10),
        vehicle_model: fullCarName,
        referral_code: referralCodeFromUrl || undefined,
        language,
      });

      // ✅ Safe storage (never breaks signup)
      try {
        localStorage.setItem("ppe_joined_email", email);
      } catch (_) {
        console.warn("localStorage blocked (Safari private)");
      }

      setSavedVehicle({ year: carYear, model: fullCarName });

      // Always show success step first
      setCurrentStep(3);
      updateProgress(3);

      // Store status URL for navigation after countdown and reset countdown
      if (result.status_url) {
        const url = result.status_url.replace("/status.html", "/status");
        setStatusUrl(url);
        setCountdown(5);
      } else {
        // No status URL, reset countdown
        setStatusUrl(null);
        setCountdown(5);
      }
    } catch (error) {
      console.error("Failed to signup:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error) || "An unknown error occurred";
      showToast(`${t("btn_error")}: ${errorMessage}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const goBack = () => {
    setCurrentStep(1);
    updateProgress(1);
    setDuplicateEmailError(false);
  };

  const updateModels = () => {
    // Reset model when make changes
    setCarModel("");
    setCarModelOther("");
  };

  const checkOtherModel = (value: string) => {
    // Reset other model input when switching away from Other
    if (value !== "Other") {
      setCarModelOther("");
    }
  };

  const openProWizard = () => {
    proSuccessDialogRef.current?.close();
    setIsProSuccessOpen(false);
    setIsWizardOpen(true);
  };

  // Handle Pro Success modal
  useEffect(() => {
    const dialog = proSuccessDialogRef.current;
    if (!dialog) return;

    if (isProSuccessOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isProSuccessOpen]);

  const carMakes = getCarMakes();
  const carModels = carMake ? getCarModels(carMake) : [];
  const years = generateYears();

  // Prepare options for SearchableSelect components
  const yearOptions = years.map((year) => ({
    value: String(year),
    label: String(year),
  }));
  const makeOptions = carMakes.map((make) => ({ value: make, label: make }));
  const modelOptions = carModels.map((model) => ({
    value: model,
    label: model,
  }));

  return (
    <div className="landing-page">
      <div className="container">
        <header ref={headerRef}>
          <a href="#" className="brand brandLanding" aria-label="Peepeep Home">
            <img
              src={logoDark}
              alt="Peepeep"
              className="brand-logo logo-light-mode"
            />
            <img
              src={logoLight}
              alt="Peepeep"
              className="brand-logo logo-dark-mode"
            />
          </a>

          <div className="header-actions">
            <button
              type="button"
              className="btn-text"
              onClick={() => setIsProOpen(true)}
            >
              {t("nav_pro")}
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              <span className="material-icons-round">
                {theme === "light" ? "dark_mode" : "light_mode"}
              </span>
            </button>
            <button
              className="lang-discreet"
              id="lang-btn"
              onClick={toggleLanguage}
            >
              <span id="lang-text">{t("btn_lang_switch")}</span>
            </button>
          </div>
        </header>

        <section className="hero">
          <h1>
            <span ref={heroLine1Ref} className="hero-line-1">
              {t("hero_title_1")}
            </span>
            <br />
            <span ref={heroLine2Ref} className="hero-line-2 h1-highlight">
              {t("hero_title_2")}
            </span>
          </h1>

          <p ref={subtitleRef} className="subtitle">
            {t("hero_subtitle")}
          </p>

          <div
            className="form-container"
            ref={formContainerRef}
            id="main-form-container"
          >
            <div className="progress-steps">
              <div
                className={`step-dot ${currentStep >= 1 ? (currentStep > 1 ? "completed" : "active") : ""}`}
                id="dot-1"
              ></div>
              <div
                className={`step-dot ${currentStep >= 2 ? (currentStep > 2 ? "completed" : "active") : ""}`}
                id="dot-2"
              ></div>
              <div
                className={`step-dot ${currentStep >= 3 ? "active" : ""}`}
                id="dot-3"
              ></div>
            </div>

            {currentStep === 1 && (
              <div className="step active" id="step-1">
                <div
                  className="card-form"
                  style={{
                    textAlign: isCheckingAvailability ? "center" : "left",
                  }}
                >
                  {isCheckingAvailability ? (
                    <div className="checking-availability">
                      <div className="checking-spinner" aria-hidden="true">
                        <span className="material-icons-round checking-icon">
                          search
                        </span>
                      </div>
                      <p className="checking-text">
                        {t("checking_availability")}
                      </p>
                      <div className="checking-dots">
                        <span className="checking-dot" />
                        <span className="checking-dot" />
                        <span className="checking-dot" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          {/* light mode: dark bg + light icon */}
                          <span className="card-logo-wrap card-logo-light-mode">
                            <img
                              src={logoIconLight}
                              alt=""
                              className="card-logo-icon"
                            />
                          </span>
                          {/* dark mode: white bg + dark icon */}
                          <span className="card-logo-wrap card-logo-dark-mode">
                            <img
                              src={logoIconDark}
                              alt=""
                              className="card-logo-icon"
                            />
                          </span>
                          <h3
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: 700,
                              margin: 0,
                            }}
                          >
                            {t("step1_header")}
                          </h3>
                        </div>
                        <span className="badge-limited">
                          <span
                            className="material-icons-round"
                            style={{ fontSize: "1rem" }}
                          >
                            star
                          </span>
                          {t("badge_limited")}
                        </span>
                      </div>

                      <form onSubmit={handleVehicleCheck}>
                        <label className="form-label-left">
                          {t("label_vehicle")}
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <SearchableSelect
                            id="car-year"
                            value={carYear}
                            onChange={(value) => setCarYear(value)}
                            options={yearOptions}
                            placeholder="Year"
                            required
                            style={{ flex: 1 }}
                          />
                          <SearchableSelect
                            id="car-make"
                            value={carMake}
                            onChange={(value) => {
                              setCarMake(value);
                              updateModels();
                            }}
                            options={makeOptions}
                            placeholder="Make"
                            required
                            showOtherOption={true}
                            onOtherSelect={() => {
                              setCarMake("Other");
                              updateModels();
                            }}
                            style={{ flex: 2 }}
                          />
                        </div>

                        {!showModelOther ? (
                          <SearchableSelect
                            id="car-model"
                            value={carModel}
                            onChange={(value) => {
                              setCarModel(value);
                              checkOtherModel(value);
                            }}
                            options={modelOptions}
                            placeholder={carMake ? "Model" : "Model"}
                            disabled={!carMake || carMake === "Other"}
                            required
                            showOtherOption={carModels.length > 0}
                            onOtherSelect={() => {
                              setCarModel("Other");
                              checkOtherModel("Other");
                            }}
                            style={{ marginBottom: "1.5rem" }}
                          />
                        ) : (
                          <input
                            type="text"
                            id="car-model-other"
                            className="vehicle-input fallback-input visible"
                            value={carModelOther}
                            onChange={(e) => setCarModelOther(e.target.value)}
                            placeholder="Enter Model Name manually"
                            style={{ marginBottom: "1.5rem" }}
                            required
                          />
                        )}

                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ width: "100%" }}
                          id="check-btn"
                        >
                          {t("btn_check")}
                        </button>
                        <div
                          style={{
                            textAlign: "center",
                            marginTop: "1rem",
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {t("txt_rollout")}
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step active" id="step-2">
                <div className="card-form" style={{ textAlign: "center" }}>
                  <div
                    style={{
                      background: "rgba(142, 152, 163, 0.12)",
                      color: "#8E98A3",
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      marginBottom: "1rem",
                    }}
                  >
                    <span
                      className="material-icons-round"
                      style={{
                        fontSize: "14px",
                        verticalAlign: "middle",
                        marginRight: "4px",
                        color: "#8E98A3",
                      }}
                    >
                      check_circle
                    </span>
                    <span>
                      {language === "en"
                        ? `Great news! We support ${carMake}.`
                        : `Bonne nouvelle ! Nous supportons ${carMake}.`}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {t("step2_title")}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                      marginBottom: "1.5rem",
                    }}
                    dangerouslySetInnerHTML={{ __html: t("step2_desc") }}
                  />

                  <form onSubmit={handleEmailSubmit}>
                    <input
                      type="email"
                      id="email-input"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setDuplicateEmailError(false);
                      }}
                      className="vehicle-input"
                      placeholder={t("placeholder_email")}
                      style={{ marginBottom: "0.5rem" }}
                      required
                    />

                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        marginBottom: "1rem",
                      }}
                    >
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "12px", color: "#10B981" }}
                      >
                        lock
                      </span>
                      <span>{t("privacy_text")}</span>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: "100%", marginBottom: "0.5rem" }}
                      id="final-btn"
                      disabled={isProcessing}
                    >
                      {duplicateEmailError
                        ? t("msg_duplicate")
                        : isProcessing
                          ? t("btn_processing")
                          : t("btn_join")}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ width: "100%" }}
                      onClick={goBack}
                    >
                      {t("btn_back")}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step active" id="step-3">
                <div className="success-message">
                  <span
                    className="material-icons-round"
                    style={{
                      fontSize: "3.5rem",
                      marginBottom: "0.5rem",
                      color: "#10B981",
                    }}
                  >
                    celebration
                  </span>
                  <div>
                    <strong
                      style={{
                        fontSize: "1.4rem",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {t("success_title")}
                    </strong>
                    <p
                      style={{
                        fontSize: "0.95rem",
                        color: "var(--text-main)",
                        lineHeight: 1.5,
                      }}
                    >
                      {savedVehicle ? (
                        <>
                          {t("success_msg")}{" "}
                          <strong>
                            {savedVehicle.year} {savedVehicle.model}
                          </strong>
                          .
                        </>
                      ) : (
                        t("success_msg_default")
                      )}
                    </p>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        opacity: 0.8,
                        marginTop: "0.5rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {t("success_sub")}
                    </p>
                    {statusUrl && countdown > 0 && (
                      <div
                        style={{
                          marginTop: "1rem",
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        Redirecting in {countdown} second
                        {countdown !== 1 ? "s" : ""}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="preview-container" ref={previewRef}>
            <div className="sneak-peek-label">
              <span className="sneak-peek-word1">{t("sneak_peek_1")}</span>{" "}
              <span className="sneak-peek-word2">{t("sneak_peek_2")}</span>
            </div>
            <p className="sneak-peek-sub">{t("sneak_peek_sub")}</p>
            <div className="dashboard-mockup">
              {/* Browser chrome */}
              <div className="mock-nav">
                <div className="mock-dot mock-dot-red"></div>
                <div className="mock-dot mock-dot-yellow"></div>
                <div className="mock-dot mock-dot-green"></div>
                <div className="mock-url-bar">
                  <span className="mock-url-icon">
                    <span
                      className="material-icons-round"
                      style={{ fontSize: "11px" }}
                    >
                      lock
                    </span>
                  </span>
                  <span className="mock-url-text">
                    app.peepeep.ca/dashboard/customer
                  </span>
                </div>
              </div>

              {/* App content */}
              <div className="mock-body">
                {/* Left column */}
                <div className="mock-left">
                  {/* Top nav row */}
                  <div className="mock-topnav">
                    <div className="mock-topnav-logo">
                      <img
                        src={logoIconLight}
                        alt="Peepeep"
                        className="mock-logo-img logo-light-mode"
                      />
                      <img
                        src={logoIconDark}
                        alt="Peepeep"
                        className="mock-logo-img logo-dark-mode"
                      />
                    </div>
                    <div className="mock-nav-card">
                      <span className="mock-nav-icon">
                        <span
                          className="material-icons-round mock-nav-icon-symbol"
                          style={{ fontSize: "13px" }}
                        >
                          build
                        </span>
                      </span>
                      <span className="mock-nav-label">Get a quote</span>
                    </div>
                    <div className="mock-nav-card">
                      <span className="mock-nav-icon">
                        <span
                          className="material-icons-round mock-nav-icon-symbol"
                          style={{ fontSize: "13px" }}
                        >
                          calendar_today
                        </span>
                      </span>
                      <span className="mock-nav-label">My bookings</span>
                    </div>
                    <div className="mock-nav-card">
                      <span className="mock-messages-icon">
                        <span className="mock-messages-blue"></span>
                        <span className="mock-messages-yellow"></span>
                      </span>
                      <span className="mock-nav-label">Messages</span>
                    </div>
                    <div className="mock-nav-card">
                      <span className="mock-nav-icon">
                        <span
                          className="material-icons-round mock-nav-icon-symbol"
                          style={{ fontSize: "13px" }}
                        >
                          directions_car
                        </span>
                      </span>
                      <span className="mock-nav-label">Vehicles</span>
                    </div>
                  </div>

                  {/* Upcoming Bookings */}
                  <div>
                    <div className="mock-section-header">
                      <span className="mock-section-title">
                        UPCOMING BOOKINGS
                      </span>
                      <span className="mock-view-all">View All</span>
                    </div>
                    <div className="mock-bookings">
                      <div className="mock-booking-row">
                        <div className="mock-date-badge">
                          <span className="mock-date-day">15</span>
                          <span className="mock-date-mon">APR</span>
                        </div>
                        <div className="mock-avatar-wrap">
                          <img
                            src={mechanic1}
                            alt=""
                            className="mock-quote-avatar"
                          />
                          <span className="mock-avatar-badge">
                            <svg
                              width="7"
                              height="7"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        </div>
                        <div className="mock-quote-info">
                          <div className="mock-quote-name">
                            Break Pad replacement
                          </div>
                          <div className="mock-quote-sub">
                            2019 Toyota Camry · Mike's Auto
                          </div>
                        </div>
                        <span className="mock-status mock-status--confirmed">
                          confirmed
                        </span>
                        <span className="mock-time">9:30 AM</span>
                      </div>
                      <div className="mock-booking-row">
                        <div className="mock-date-badge mock-date-badge--muted">
                          <span className="mock-date-day">18</span>
                          <span className="mock-date-mon">APR</span>
                        </div>
                        <div className="mock-avatar-wrap">
                          <img
                            src={mechanic2}
                            alt=""
                            className="mock-quote-avatar"
                          />
                          <span className="mock-avatar-badge">
                            <svg
                              width="7"
                              height="7"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        </div>
                        <div className="mock-quote-info">
                          <div className="mock-quote-name">
                            Oil change &amp; filter
                          </div>
                          <div className="mock-quote-sub">
                            2021 Honda Civic · QuickFix Garage
                          </div>
                        </div>
                        <span className="mock-status mock-status--pending">
                          pending
                        </span>
                        <span className="mock-time">9:30 AM</span>
                      </div>
                      <div className="mock-booking-row">
                        <div className="mock-date-badge mock-date-badge--muted">
                          <span className="mock-date-day">10</span>
                          <span className="mock-date-mon">APR</span>
                        </div>
                        <div className="mock-avatar-wrap">
                          <img
                            src={mechanic3}
                            alt=""
                            className="mock-quote-avatar"
                          />
                          <span className="mock-avatar-badge">
                            <svg
                              width="7"
                              height="7"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        </div>
                        <div className="mock-quote-info">
                          <div className="mock-quote-name">Tire rotation</div>
                          <div className="mock-quote-sub">
                            2020 Tesla Model 3 · AutoCare Pro
                          </div>
                        </div>
                        <span className="mock-status mock-status--completed">
                          completed
                        </span>
                        <span className="mock-time">9:30 AM</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right sidebar */}
                <div className="mock-right">
                  {/* Primary Vehicle */}
                  <div className="mock-sidebar-box">
                    <div className="mock-sidebar-label">PRIMARY VEHICLE</div>
                    <div className="mock-vehicle-row">
                      <span className="material-icons-round mock-vehicle-icon">
                        directions_car
                      </span>
                      <div>
                        <div className="mock-vehicle-name">
                          2019 Toyota Camry
                        </div>
                        <div className="mock-vehicle-sub">
                          Last Service: 2 weeks ago
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warranty */}
                  <div className="mock-sidebar-box">
                    <div className="mock-warranty-label">
                      <span
                        className="material-icons-round"
                        style={{ fontSize: "10px" }}
                      >
                        shield
                      </span>
                      WARRANTY
                    </div>
                    <div className="mock-warranty-name">
                      Break Pad replacement
                    </div>
                    <div className="mock-progress-track">
                      <div className="mock-progress-fill"></div>
                    </div>
                    <div className="mock-warranty-sub">10 Months Remaining</div>
                  </div>

                  {/* Total Saved */}
                  <div className="mock-total-saved">
                    <div className="mock-total-saved-label">
                      Total Saved vs dealership average
                    </div>
                    <div className="mock-total-saved-amount">$482</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="features" ref={featuresRef}>
        <div className="container">
          <h2 className="features-title">{t("features_title")}</h2>
          <div className="feature-grid">
            <div className="feature-item feature-logo-card">
              <img
                src={logoIconDark}
                alt="Peepeep"
                className="feature-brand-logo"
              />
            </div>
            <div className="feature-item feature-stat-card">
              <span className="material-icons-round f-icon">show_chart</span>
              <h3>{t("feat1_title")}</h3>
              <p className="forPadding">{t("feat1_desc")}</p>
            </div>
            <div className="feature-item feature-stat-card">
              <span className="material-icons-round f-icon">sell</span>
              <h3>{t("feat2_title")}</h3>
              <p className="forPadding">{t("feat2_desc")}</p>
            </div>
            <div className="feature-item feature-stat-card">
              <span className="material-icons-round f-icon">verified_user</span>
              <h3>{t("feat3_title")}</h3>
              <p className="forPadding">{t("feat3_desc")}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-watermark" aria-hidden="true">
          <span className="footer-watermark-text">
            Compare&nbsp;&nbsp;&nbsp;Connect&nbsp;&nbsp;Repair
          </span>
          <span className="footer-dot footer-dot-grey" />
          <span className="footer-dot footer-dot-yellow" />
          <span className="footer-dot footer-dot-blue" />
        </div>
        <div className="footer-bottom">
          <div className="container">
            <div className="footer-bottom-inner">
              <p className="footer-copy">
                © 2026 Peepeep Inc. Made with{" "}
                <span className="footer-heart">♥</span> in Montreal.
              </p>
              <div className="footer-social">
                <a
                  href="https://www.facebook.com/people/Peepeep/61583160867114/"
                  className="footer-social-link"
                  aria-label="Facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="footer-social-icon"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/Peepeep_app"
                  className="footer-social-link"
                  aria-label="X"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="footer-social-icon"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@peepeep_auto?lang=en"
                  className="footer-social-link"
                  aria-label="TikTok"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="footer-social-icon"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.86 1.55V6.79a4.85 4.85 0 01-1.09-.1z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/peepeep__?igsh=YWg3YjN1ZnN3cnJ0"
                  className="footer-social-link"
                  aria-label="Instagram"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="footer-social-icon"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        language={language}
      />

      <ProModal
        isOpen={isProOpen}
        onClose={() => setIsProOpen(false)}
        language={language}
        onOpenWizard={() => {
          setIsProSuccessOpen(true);
        }}
        setStoredBizName={setStoredBizName}
        setStoredProviderEmail={setStoredProviderEmail}
      />

      <ProWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        language={language}
        businessName={storedBizName}
        email={storedProviderEmail}
      />

      <div className={`mobile-sticky ${mobileStickyVisible ? "visible" : ""}`}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%" }}
          onClick={scrollToForm}
        >
          {language === "en" ? "Join Waitlist & Save" : "Rejoindre la liste"}
        </button>
      </div>

      {/* Pro Success Modal – landing-style background */}
      <dialog
        ref={proSuccessDialogRef}
        className="modal modal-pro-success"
        id="modal-pro-success"
      >
        <div className="modal-body">
          <div className="pro-success-icon">
            <span className="material-icons-round">rocket_launch</span>
          </div>
          <h2 className="pro-success-title">{t("success_pro_title")}</h2>
          <p className="pro-success-desc">{t("success_pro_desc")}</p>

          <div className="pro-success-nba">
            <div className="pro-success-nba-title">{t("nba_title")}</div>
            <p className="pro-success-nba-desc">{t("nba_desc")}</p>
            <button
              className="btn btn-primary"
              style={{ width: "100%", fontWeight: 800 }}
              onClick={openProWizard}
            >
              {t("nba_btn")}
            </button>
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: "1rem" }}
            onClick={() => {
              proSuccessDialogRef.current?.close();
              setIsProSuccessOpen(false);
            }}
          >
            {t("btn_close")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
