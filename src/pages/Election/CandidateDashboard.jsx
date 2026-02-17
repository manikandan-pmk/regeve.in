// components/CandidateDashboard.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import axios from "axios";
import ElectionDashboard from "./ElectionDashboard";
import { adminNavigate } from "../../utils/adminNavigation";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "https://api.regeve.in/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("jwt");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const CandidateDashboard = () => {
  const { adminId, electionDocumentId } = useParams();
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [sections, setSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
  const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] =
    useState(false);
  const [sectionToDelete, setSectionToDelete] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [fieldFocus, setFieldFocus] = useState(null);
  const [showStartElection, setShowStartElection] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [startingElection, setStartingElection] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [electionStatus, setElectionStatus] = useState(null);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [declaringWinner, setDeclaringWinner] = useState(false);
  const [celebratingWinner, setCelebratingWinner] = useState(false);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("09");
  const [startMinute, setStartMinute] = useState("00");
  const [endDate, setEndDate] = useState("");
  const [endHour, setEndHour] = useState("17");
  const [endMinute, setEndMinute] = useState("00");
  const [restartReason, setRestartReason] = useState("");
  const [showRestartReason, setShowRestartReason] = useState(false);

  const reloadRef = useRef({
    started: false,
    ended: false,
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
    whatsApp_number: "",
    age: "",
    gender: "",
    sectionId: null,
  });
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);

  const formModalRef = useRef(null);
  const detailsModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const addSectionRef = useRef(null);
  const deleteSectionModalRef = useRef(null);

  const [electionMeta, setElectionMeta] = useState({
    electionName: "",
    electionType: "",
    electionCategory: "",
    start_time: null,
    end_time: null,
    election_status: null,
    auto_declare_enabled: false,
  });

  // Helper functions for date/time handling
  const getCurrentDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const updateStartTime = (date, hour, minute) => {
    if (!date || hour === "" || minute === "") return;
    setStartTime(`${date}T${hour}:${minute}:00`);
  };

  const updateEndTime = (date, hour, minute) => {
    if (!date || hour === "" || minute === "") return;
    setEndTime(`${date}T${hour}:${minute}:00`);
  };

  // Initialize date/time when modal opens
  // Initialize date/time when modal opens
  useEffect(() => {
    if (showStartElection) {
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];

      // Set start time to current time (rounded to nearest 15 minutes)
      const startTime = new Date(now);
      const minutes = Math.ceil(startTime.getMinutes() / 15) * 15;
      startTime.setMinutes(minutes);
      startTime.setSeconds(0);

      const startHour = startTime.getHours().toString().padStart(2, "0");
      const startMinute = startTime.getMinutes().toString().padStart(2, "0");

      setStartDate(currentDate);
      setStartHour(startHour);
      setStartMinute(startMinute);
      updateStartTime(currentDate, startHour, startMinute);

      // Set end time to 2 hours from start time
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

      // Check if end time is on a different date
      const endDate = endTime.toISOString().split("T")[0];
      const endHour = endTime.getHours().toString().padStart(2, "0");
      const endMinute = endTime.getMinutes().toString().padStart(2, "0");

      setEndDate(endDate);
      setEndHour(endHour);
      setEndMinute(endMinute);
      updateEndTime(endDate, endHour, endMinute);
    }
  }, [showStartElection]);
  // Show alert message with auto-dismiss
  const showAlert = (type, text, duration = 5000, field = null) => {
    setMessage({ type, text, field });
    if (field) {
      setFieldFocus(field);
    }
    setTimeout(() => {
      setMessage(null);
      setFieldFocus(null);
    }, duration);
  };

  // Auto-focus on field with error
  useEffect(() => {
    if (fieldFocus && formModalRef.current) {
      const input = formModalRef.current.querySelector(
        `[name="${fieldFocus}"]`
      );
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [fieldFocus]);

  // Fetch sections from backend
  useEffect(() => {
    if (!electionDocumentId) return;

    const fetchElectionMeta = async () => {
      try {
        const res = await axiosInstance.get(
          `/election-names/${electionDocumentId}`
        );

        const election = res.data?.data;

        if (!election) {
          console.error("Election not found with documentId:");
          showAlert("error", "Election not found");
          adminNavigate(navigate, "/electionhome");
          return;
        }

        setElectionMeta({
          electionName: election.Election_Name,
          electionType: election.Election_Type,
          electionCategory: election.Election_Category,
          start_time: election.start_time,
          end_time: election.end_time,
          election_status: election.election_status,
          auto_declare_enabled: election.auto_declare_enabled,
        });
      } catch (err) {
        console.error("Election meta fetch failed:", err);
        showAlert("error", "Failed to load election data");
        adminNavigate(navigate, "/electionhome");
      }
    };

    fetchElectionMeta();
  }, [electionDocumentId]);

  const refetchElectionMeta = async () => {
    const res = await axiosInstance.get(
      `/election-names/${electionDocumentId}`
    );
    const election = res.data?.data;
    setElectionMeta({
      electionName: election.Election_Name,
      electionType: election.Election_Type,
      electionCategory: election.Election_Category,
      start_time: election.start_time,
      end_time: election.end_time,
      election_status: election.election_status,
      auto_declare_enabled: election.auto_declare_enabled,
    });
  };

  useEffect(() => {
    if (!electionMeta.election_status) return;
    setElectionStatus(electionMeta.election_status);
  }, [electionMeta.election_status]);

  useEffect(() => {
    if (!electionMeta.start_time || !electionMeta.end_time) return;
    if (!electionDocumentId) return;

    const START_KEY = `election_${electionDocumentId}_start_reloaded`;
    const END_KEY = `election_${electionDocumentId}_end_reloaded`;

    const interval = setInterval(() => {
      const now = Date.now();
      const start = new Date(electionMeta.start_time).getTime();
      const end = new Date(electionMeta.end_time).getTime();

      if (now < start) {
        const diff = start - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        if (diff <= 1000) {
          setTimeLeft("Starting...");

          if (!sessionStorage.getItem(START_KEY)) {
            sessionStorage.setItem(START_KEY, "true");
            clearInterval(interval);

            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } else {
          setTimeLeft(`Starts in ${h}h ${m}m ${s}s`);
        }
        return;
      }

      if (now >= start && now < end) {
        const diff = end - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        setTimeLeft(`Ends in ${h}h ${m}m ${s}s`);
        return;
      }

      if (now >= end) {


        if (!sessionStorage.getItem(END_KEY)) {
          sessionStorage.setItem(END_KEY, "true");
          clearInterval(interval);

          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [electionMeta.start_time, electionMeta.end_time, electionDocumentId]);

  // Click outside to close modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      const modals = [
        { show: showForm, ref: formModalRef },
        { show: showDetails, ref: detailsModalRef },
        { show: showDeleteConfirm, ref: deleteModalRef },
        { show: showAddSection, ref: addSectionRef },
        { show: showDeleteSectionConfirm, ref: deleteSectionModalRef },
      ];

      modals.forEach(({ show, ref }) => {
        if (show && ref.current && !ref.current.contains(event.target)) {
          if (show === showDeleteSectionConfirm) {
            setShowDeleteSectionConfirm(false);
            setSectionToDelete(null);
          } else if (show === showDeleteConfirm) {
            setShowDeleteConfirm(false);
            setCandidateToDelete(null);
          } else if (show === showForm) {
            setShowForm(false);
          } else if (show === showDetails) {
            setShowDetails(false);
          } else if (show === showAddSection) {
            setShowAddSection(false);
            setNewSectionName("");
          }
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showForm,
    showDetails,
    showDeleteConfirm,
    showAddSection,
    showDeleteSectionConfirm,
  ]);

  // Fetch sections from backend
  const fetchSections = async () => {
    try {
      setIsFetchingCandidates(true);

      const response = await axiosInstance.get(
        `/election-candidate-positions?electionId=${electionDocumentId}`
      );

      const list = response.data.data;

      const sectionsData = list.map((section) => ({
        id: section.id,
        name: section.Position,
        position: section.Position,
        isOpen: true,
        election_name: section.election_name,
        candidates:
          section.candidates?.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone_number,
            whatsapp: c.whatsApp_number,
            age: c.age,
            gender: c.gender,
            candidate_id: c.candidate_id,
            position: section.Position,
            IsWinnedCandidate: c.IsWinnedCandidate,
            vote_count: c.vote_count,
            photoUrl: c.photo?.url
              ? `https://api.regeve.in${c.photo.url}`
              : null,
          })) || [],
      }));

      setSections(sectionsData);
    } catch (err) {
      console.error("Error fetching sections:", err);
      showAlert("error", "Failed to fetch sections");
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  useEffect(() => {
    if (electionDocumentId) {
      fetchSections();
    }
  }, [electionDocumentId]);

  // Check for duplicate email, phone, or whatsapp
  const checkDuplicates = (candidateData = formData) => {
    const allCandidates = sections.flatMap((section) => section.candidates);
    const errors = {};

    if (selectedCandidate && candidateData.email === selectedCandidate.email) {
    } else if (
      candidateData.email &&
      allCandidates.some((c) => c.email === candidateData.email)
    ) {
      errors.email = "This email is already registered";
      showAlert(
        "error",
        "A candidate with this email already exists. Please use a different email.",
        5000,
        "email"
      );
    }

    if (
      candidateData.phone_number &&
      allCandidates.some((c) => c.phone === candidateData.phone_number)
    ) {
      errors.phone_number = "This phone number is already registered";
      showAlert(
        "error",
        "A candidate with this phone number already exists. Please use a different number.",
        5000,
        "phone_number"
      );
    }

    if (
      candidateData.whatsApp_number &&
      allCandidates.some((c) => c.whatsapp === candidateData.whatsApp_number)
    ) {
      errors.whatsApp_number = "This WhatsApp number is already registered";
      showAlert(
        "error",
        "A candidate with this WhatsApp number already exists. Please use a different number.",
        5000,
        "whatsApp_number"
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length > 0;
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    const requiredFields = ["name", "email", "phone_number", "sectionId"];

    requiredFields.forEach((field) => {
      if (!formData[field]) {
        errors[field] = `${field.replace("_", " ")} is required`;
      }
    });

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (formData.phone_number && !/^\d+$/.test(formData.phone_number)) {
      errors.phone_number = "Please enter only numbers";
    }

    if (formData.whatsApp_number && !/^\d+$/.test(formData.whatsApp_number)) {
      errors.whatsApp_number = "Please enter only numbers";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }

    if (name === "sectionId") {
      const id = Number(value);
      setFormData((prev) => ({
        ...prev,
        sectionId: id,
      }));
      return;
    }

    if (type === "file") {
      setPhoto(files[0]);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (["email", "phone_number", "whatsApp_number"].includes(name)) {
        setTimeout(() => {
          checkDuplicates({ ...formData, [name]: value });
        }, 500);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      const firstErrorField = Object.keys(formErrors)[0];
      if (firstErrorField) {
        showAlert("error", formErrors[firstErrorField], 5000, firstErrorField);
      }
      setLoading(false);
      return;
    }

    if (checkDuplicates()) {
      setLoading(false);
      return;
    }

    try {
      let photoId = null;

      if (photo) {
        const fd = new FormData();
        fd.append("files", photo);

        try {
          const uploadResp = await axiosInstance.post("/upload", fd);

          if (uploadResp.data && uploadResp.data.length > 0) {
            photoId = uploadResp.data[0].id;
          }
        } catch (uploadErr) {
          console.error("Photo upload failed:", uploadErr);
          showAlert(
            "warning",
            "Photo upload failed, creating candidate without photo"
          );
        }
      }

      const payload = {
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone_number
            ? Number(formData.phone_number)
            : null,
          whatsApp_number: formData.whatsApp_number
            ? Number(formData.whatsApp_number)
            : null,
          age: formData.age ? Number(formData.age) : null,
          gender: formData.gender || null,
          photo: photoId,
          election_candidate_position: Number(formData.sectionId),
          election_name: electionDocumentId,
        },
      };

      const response = await axiosInstance.post("/candidates", payload);

      if (response.status === 201) {
        showAlert("success", "Candidate added successfully");

        setShowForm(false);
        setFormData({
          name: "",
          email: "",
          phone_number: "",
          whatsApp_number: "",
          age: "",
          gender: "",
          sectionId: null,
        });
        setPhoto(null);
        setFormErrors({});

        await fetchSections();
        setDashboardRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error creating candidate:", err);
      let errorMsg = "Failed to add candidate";
      if (err.response?.data?.error?.message) {
        errorMsg = err.response.data.error.message;
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      showAlert("error", errorMsg);
    }

    setLoading(false);
  };

  const MIN_BUFFER_MINUTES = 10;

  const validateElectionTimeUI = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return "Start time and end time are required";
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return "Invalid date or time selection";
    }

    // const diffMinutes = (start.getTime() - now.getTime()) / 60000;
    // if (diffMinutes < 10) {
    //   return "Start time must be at least 10 minutes from now";
    // }

    if (end <= start) {
      return "End time must be after start time";
    }

    // const durationMinutes = (end - start) / 60000;
    // if (durationMinutes < 30) {
    //   return "Election should last at least 30 minutes";
    // }

    return null;
  };

  // Update validation when dates/times change
  useEffect(() => {
    if (showStartElection) {
      updateStartTime(startDate, startHour, startMinute);
      updateEndTime(endDate, endHour, endMinute);
    }
  }, [
    startDate,
    startHour,
    startMinute,
    endDate,
    endHour,
    endMinute,
    showStartElection,
  ]);

  const validateCandidatesPerPosition = () => {
    if (!sections || sections.length === 0) {
      return "You must create at least one position before starting the election";
    }

    const invalidSections = sections.filter(
      (section) => section.candidates.length < 2
    );

    if (invalidSections.length > 0) {
      const names = invalidSections.map((s) => s.name).join(", ");
      return `Each position must have at least 2 candidates. Please add more candidates to: ${names}`;
    }

    return null; // ✅ all good
  };
  const handleRestartReasonSubmit = async () => {
    if (restartReason.trim().length < 5) {
      showAlert("error", "Restart reason must be at least 5 characters");
      return;
    }

    try {
      setStartingElection(true);

      // 🔥 CALL BACKEND IMMEDIATELY
      await axiosInstance.put(`/election-names/${electionDocumentId}/restart`, {
        restart_reason: restartReason.trim(),
      });

      // refresh meta after backend update
      await refetchElectionMeta();
      await fetchSections();

      showAlert("success", "Restart reason saved successfully");

      // ✅ CLOSE reason modal
      setShowRestartReason(false);
    } catch (err) {
      showAlert(
        "error",
        err.response?.data?.message || "Failed to restart election"
      );
    } finally {
      setStartingElection(false);
    }
  };

  const handleStartElection = async () => {
    const candidateError = validateCandidatesPerPosition();
    if (candidateError) {
      setShowStartElection(false); // ✅ close modal

      setTimeout(() => {
        showAlert("error", candidateError);
      }, 100);

      return;
    }

    const error = validateElectionTimeUI(startTime, endTime);
    if (error) {
      showAlert("error", error);
      return;
    }

    try {
      setStartingElection(true);

      const startUTC = new Date(startTime).toISOString();
      const endUTC = new Date(endTime).toISOString();

      const endpoint = `/election-names/${electionDocumentId}/start`;


      const payload = {
        start_time: startUTC,
        end_time: endUTC,
      };

      if (electionStatus === "ended") {
        payload.restart_reason = restartReason; // 🔥 MISSING
      }

      await axiosInstance.put(endpoint, payload);

      await refetchElectionMeta();

      const START_KEY = `election_${electionDocumentId}_start_reloaded`;
      const END_KEY = `election_${electionDocumentId}_end_reloaded`;

      sessionStorage.removeItem(START_KEY);
      sessionStorage.removeItem(END_KEY);

      showAlert(
        "success",
        electionStatus === "ended"
          ? "Election restarted successfully"
          : "Election scheduled successfully"
      );

      setShowStartElection(false);
      await refetchElectionMeta();
    } catch (err) {
      setShowStartElection(false); // ✅ CLOSE MODAL FIRST

      setTimeout(() => {
        showAlert(
          "error",
          err.response?.data?.message || "Failed to start election"
        );
      }, 100); // slight delay so modal unmounts cleanly
    } finally {
      setStartingElection(false);
    }
  };

  // Create new section (Election Position)
  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      setShowAddSection(false);

      setTimeout(() => {
        showAlert("error", "Please enter a position name");
      }, 100);

      return;
    }

    if (
      sections.some(
        (section) =>
          section.name.toLowerCase() === newSectionName.trim().toLowerCase()
      )
    ) {
      setShowAddSection(false);

      setTimeout(() => {
        showAlert("error", "A position with this name already exists");
      }, 100);

      return;
    }

    try {
      const payload = {
        data: {
          Position: newSectionName.trim(),
          election_name: electionDocumentId,
        },
      };

      await axiosInstance.post("/election-candidate-positions", payload);
      await fetchSections();
      setDashboardRefreshKey((prev) => prev + 1);

      setNewSectionName("");
      setShowAddSection(false);
      showAlert("success", `Position "${newSectionName}" created successfully`);
    } catch (err) {
      console.error("Error creating position:", err);
      showAlert("error", "Failed to create position");
    }
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setShowDetails(true);
  };

  const handleDeleteClick = (candidate) => {
    setCandidateToDelete(candidate);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;

    try {
      await axiosInstance.delete(`/candidates/${candidateToDelete.id}`);

      await fetchSections();
      setDashboardRefreshKey((prev) => prev + 1);

      showAlert("success", "Candidate deleted successfully");
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to delete candidate");
    }

    setShowDeleteConfirm(false);
    setCandidateToDelete(null);
  };

  const handleDeleteSectionClick = (sectionId, e) => {
    e.stopPropagation();
    const section = sections.find((s) => s.id === sectionId);
    setSectionToDelete(section);
    setShowDeleteSectionConfirm(true);
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;

    if (sections.length <= 1) {
      showAlert("error", "Cannot delete the last position");
      setShowDeleteSectionConfirm(false);
      setSectionToDelete(null);
      return;
    }

    try {
      await axiosInstance.delete(
        `/election-candidate-positions/${sectionToDelete.id}`
      );

      setSections(
        sections.filter((section) => section.id !== sectionToDelete.id)
      );
      await fetchSections();
      setDashboardRefreshKey((prev) => prev + 1);

      showAlert("success", "Position deleted successfully");
    } catch (err) {
      console.error(err);
      showAlert("error", "Failed to delete position");
    }

    setShowDeleteSectionConfirm(false);
    setSectionToDelete(null);
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSection = (sectionId) => {
    setSections(
      sections.map((section) =>
        section.id === sectionId
          ? { ...section, isOpen: !section.isOpen }
          : section
      )
    );
  };

  const handleDeclareWinnerBackend = async (sectionId) => {
    try {
      setDeclaringWinner(true);
      setCelebratingWinner(true);

      await axiosInstance.post("/election-winners/declare", {
        //adminId: Number(adminId),
        electionId: electionDocumentId,
        positionId: Number(sectionId),
      });

      showAlert("success", "🎉 Winner declared successfully!");

      // Show winner overlay automatically
      setShowWinnerOverlay(sectionId);

      // Hide celebration after 3 seconds
      setTimeout(() => {
        setCelebratingWinner(false);
      }, 3000);

      await fetchSections();
      setDashboardRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      showAlert(
        "error",
        err.response?.data?.message || "Failed to declare winner"
      );
    } finally {
      setDeclaringWinner(false);
    }
  };

  const getWinnerForSection = (section) => {
    return section.candidates.find((c) => c.IsWinnedCandidate === true);
  };

  // Calculate total candidates across all sections
  const totalCandidates = sections.reduce(
    (total, section) => total + section.candidates.length,
    0
  );

  const toggleWinnerOverlay = (sectionId) => {
    if (showWinnerOverlay === sectionId) {
      setShowWinnerOverlay(null);
    } else {
      setShowWinnerOverlay(sectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3 sm:p-4 md:p-6 lg:p-8 relative">
      {/* Celebration Animation Overlay */}
      {celebratingWinner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-emerald-400/20 animate-pulse"></div>
          <motion.div
            initial={{ y: -100, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="absolute top-1/4 left-1/2 transform -translate-x-1/2"
          >
            <div className="animate-bounce text-6xl">🏆</div>
          </motion.div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent animate-glow">
              WINNER DECLARED!
            </div>
          </motion.div>
          <motion.div
            initial={{ y: 100, scale: 0 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2"
          >
            <div className="animate-float text-5xl">🎉</div>
          </motion.div>
        </motion.div>
      )}

      {/* Alert Message Container */}
      {message && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999]`}
        >
          <div
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
              message.type === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-emerald-50 border border-emerald-200 text-emerald-800"
            }`}
          >
            {message.type === "success" ? (
              <svg
                className="w-5 h-5 text-emerald-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-red-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        </motion.div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto">
        {/* Back Navigation */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => adminNavigate(navigate, "/electionhome")}
            className="inline-flex cursor-pointer items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors duration-200 group animate-fadeIn"
          >
            <svg
              className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="font-medium">Back to select election</span>
          </button>

          <button
            onClick={() =>
              navigate(
                `/${adminId}/participant-dashboard/${electionDocumentId}`
              )
            }
            className="flex cursor-pointer items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl min-w-[160px] animate-pulse hover:animate-none"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Participations
          </button>
        </div>

        {/* Main Dashboard Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Election Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                    {electionMeta.electionCategory}
                  </span>
                </div>
                <div className="w-px h-4 bg-slate-300"></div>
                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full hover:scale-105 transition-transform duration-200">
                  {totalCandidates} Candidate{totalCandidates !== 1 ? "s" : ""}
                </span>
                <div className="w-px h-4 bg-slate-300"></div>
                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:scale-105 transition-transform duration-200">
                  {sections.length} Position{sections.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                  {electionMeta.electionName}
                </h1>

                {electionStatus && (
                  <span
                    className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full ${
                      electionStatus === "active"
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                        : electionStatus === "scheduled"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : "bg-red-100 text-red-700 border border-red-300"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        electionStatus === "active"
                          ? "bg-emerald-500 animate-pulse"
                          : electionStatus === "scheduled"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    ></span>
                    {electionStatus === "active" && "Active"}
                    {electionStatus === "scheduled" && "Scheduled"}
                    {electionStatus === "ended" && "Ended"}
                  </span>
                )}

                {timeLeft && (
                  <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 text-yellow-700 animate-pulse">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {timeLeft}
                  </span>
                )}
              </div>

              <p className="text-slate-600 text-lg">
                {electionMeta.electionType} • Candidate Management
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
              {/* Auto Declare Toggle */}
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm transition-all
    ${
      electionMeta.auto_declare_enabled
        ? "bg-green-50 border-green-300"
        : "bg-slate-50 border-slate-300"
    }
    ${electionStatus !== "scheduled" ? "opacity-60 cursor-not-allowed" : ""}
  `}
              >
                <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                  Auto Declare
                </span>

                <button
                  type="button"
                  disabled={electionStatus !== "scheduled"}
                  onClick={async () => {
                    if (electionStatus !== "scheduled") return;

                    const nextValue = !electionMeta.auto_declare_enabled;

                    try {
                      await axiosInstance.put(
                        `/election-names/${electionDocumentId}`,
                        {
                          data: {
                            auto_declare_enabled: nextValue,
                          },
                        }
                      );

                      setElectionMeta((prev) => ({
                        ...prev,
                        auto_declare_enabled: nextValue,
                      }));
                    } catch {
                      showAlert(
                        "error",
                        "Failed to update auto declare setting"
                      );
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
    ${electionMeta.auto_declare_enabled ? "bg-green-500" : "bg-gray-300"}
    ${electionStatus === "scheduled" ? "cursor-pointer" : "cursor-not-allowed"}
  `}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform
      ${electionMeta.auto_declare_enabled ? "translate-x-5" : "translate-x-1"}
    `}
                  />
                </button>
              </div>

              {electionStatus === "scheduled" && (
                <div className="flex flex-col xs:flex-row gap-3 w-full sm:w-auto">
                  {/* Start Election Button - Only show if election is scheduled but not cancelled */}
                  <button
                    onClick={() => {
                      setRestartReason("");
                      setShowStartElection(true); // FIRST popup
                    }}
                    className="flex cursor-pointer items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg min-w-[160px] hover:scale-105 transition-all duration-300 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {electionMeta.start_time ? "Reschedule" : "Start Election"}
                  </button>
                </div>
              )}
              {electionStatus === "active" && (
                <button
                  onClick={async () => {
                    if (!confirm("Are you sure you want to end this election?"))
                      return;

                    await axiosInstance.put(
                      `/election-names/${electionDocumentId}/end`
                    );

                    showAlert("success", "Election ended successfully");
                    await refetchElectionMeta();
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  End Election
                </button>
              )}
              {electionStatus === "ended" && (
                <button
                  onClick={() => {
                    setRestartReason("");
                    setShowRestartReason(true); // ✅ FIRST popup
                  }}
                  className="flex cursor-pointer items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 min-w-[160px]"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Restart Election
                </button>
              )}
              {electionStatus === "scheduled" && (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="flex cursor-pointer items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 sm:px-6 py-3 rounded-xl
      hover:from-blue-600 hover:to-blue-700 transition-all duration-300
      font-semibold shadow-lg hover:shadow-xl hover:scale-105 min-w-[160px]"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Position
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showRestartReason && (
            <motion.div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl"
              >
                {/* Header with proper alignment */}
                <div className="flex flex-col items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 text-center mb-1">
                    Restart Election
                  </h2>
                  <p className="text-sm text-gray-500 text-center">
                    Please provide a reason for restarting this election
                  </p>
                </div>

                {/* Textarea section */}
                <div className="space-y-2">
                  <label
                    htmlFor="restart-reason"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="restart-reason"
                    value={restartReason}
                    onChange={(e) => setRestartReason(e.target.value)}
                    placeholder="Enter a detailed reason for restarting the election (minimum 5 characters)..."
                    className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder:text-gray-400 resize-y"
                    rows={4}
                  />
                  <div className="flex justify-between items-center">
                    <p
                      className={`text-xs ${
                        restartReason.trim().length < 5
                          ? "text-red-500"
                          : "text-green-500"
                      }`}
                    >
                      {restartReason.trim().length}/5 characters minimum
                    </p>
                    <p className="text-xs text-gray-500">Required</p>
                  </div>
                </div>

                {/* Button group with proper spacing */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowRestartReason(false)}
                    className="px-4 cursor-pointer py-2.5 border border-gray-300 rounded-lg font-medium
                     text-gray-700 hover:bg-gray-50 transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    Cancel
                  </button>

                  <button
                    disabled={
                      restartReason.trim().length < 5 || startingElection
                    }
                    onClick={handleRestartReasonSubmit}
                    className={`px-4 cursor-pointer py-2.5 rounded-lg font-medium transition-all duration-150
    ${
      restartReason.trim().length < 5 || startingElection
        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
        : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
    }`}
                  >
                    {startingElection ? "Processing..." : "Continue"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Election Modal */}
        <AnimatePresence>
          {showStartElection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200"
              >
                <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Schedule Election
                    </h2>
                    <p className="text-sm text-slate-500">
                      Set start and end date & time
                    </p>
                  </div>
                  <button
                    onClick={() => setShowStartElection(false)}
                    className="w-8 cursor-pointer h-8 bg-red-600/70 rounded-xl hover:bg-red-600 text-white transition-colors duration-200 flex items-center justify-center hover:rotate-90 transition-transform"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-6 py-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          updateStartTime(
                            e.target.value,
                            startHour,
                            startMinute
                          );
                        }}
                        className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        min={getCurrentDate()}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Start Hour
                        </label>
                        <select
                          value={startHour}
                          onChange={(e) => {
                            setStartHour(e.target.value);
                            updateStartTime(
                              startDate,
                              e.target.value,
                              startMinute
                            );
                          }}
                          className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        >
                          {Array.from({ length: 24 }, (_, i) =>
                            i.toString().padStart(2, "0")
                          ).map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Start Minute
                        </label>
                        <select
                          value={startMinute}
                          onChange={(e) => {
                            setStartMinute(e.target.value);
                            updateStartTime(
                              startDate,
                              startHour,
                              e.target.value
                            );
                          }}
                          className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        >
                          {Array.from({ length: 60 }, (_, i) =>
                            i.toString().padStart(2, "0")
                          ).map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          updateEndTime(e.target.value, endHour, endMinute);
                        }}
                        className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        min={startDate || getCurrentDate()}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          End Hour
                        </label>
                        <select
                          value={endHour}
                          onChange={(e) => {
                            setEndHour(e.target.value);
                            updateEndTime(endDate, e.target.value, endMinute);
                          }}
                          className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        >
                          {Array.from({ length: 24 }, (_, i) =>
                            i.toString().padStart(2, "0")
                          ).map((hour) => (
                            <option key={hour} value={hour}>
                              {hour}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          End Minute
                        </label>
                        <select
                          value={endMinute}
                          onChange={(e) => {
                            setEndMinute(e.target.value);
                            updateEndTime(endDate, endHour, e.target.value);
                          }}
                          className="w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 transition-all duration-300 hover:border-emerald-400"
                        >
                          {Array.from({ length: 60 }, (_, i) =>
                            i.toString().padStart(2, "0")
                          ).map((minute) => (
                            <option key={minute} value={minute}>
                              {minute}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {validateElectionTimeUI(startTime, endTime) && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
                      <div className="flex cursor-pointer items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {validateElectionTimeUI(startTime, endTime)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                  <button
                    onClick={() => setShowStartElection(false)}
                    className="rounded-lg border border-slate-300 px-5 py-2.5 text-slate-700 font-semibold hover:bg-slate-50 transition-all duration-300 hover:scale-105"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleStartElection}
                    disabled={startingElection}
                    className={`rounded-lg cursor-pointer px-5 py-2.5 font-semibold text-white transition-all duration-300 hover:scale-105
                      ${
                        startingElection ||
                        validateElectionTimeUI(startTime, endTime)
                          ? "bg-slate-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg"
                      }`}
                  >
                    {startingElection
                      ? electionStatus === "ended"
                        ? "Restarting..."
                        : "Starting..."
                      : electionStatus === "ended"
                      ? "Restart Election"
                      : "Start Election"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Section Modal */}
        <AnimatePresence>
          {showAddSection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                ref={addSectionRef}
                className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-md mx-2 p-4 sm:p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Add Election Position
                    </h3>
                    <p className="text-slate-600 text-sm">
                      Create a new position for candidates
                    </p>
                  </div>
                </div>

                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Enter position name (e.g., President, Secretary)"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 text-sm transition-all duration-300 hover:border-blue-400"
                  onKeyPress={(e) => e.key === "Enter" && handleAddSection()}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowAddSection(false);
                      setNewSectionName("");
                    }}
                    className="flex-1 cursor-pointer px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-all duration-300 hover:scale-105"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddSection}
                    className="flex-1 cursor-pointer px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    Create Position
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isFetchingCandidates && (
          <div className="mb-6 text-center py-8">
            <div className="inline-flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-slate-600 mt-4 font-medium animate-pulse">
                Loading candidates...
              </p>
            </div>
          </div>
        )}

        {/* Sections with Candidates */}
        <div className="space-y-6">
          {sections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 sm:p-12 text-center"
            >
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  No Election Positions Yet
                </h3>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Create your first election position for{" "}
                  <strong className="text-blue-600">
                    {electionMeta.electionName}
                  </strong>
                  . Each position will have its own section of candidates.
                </p>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-semibold inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create First Position
                </button>
              </div>
            </motion.div>
          ) : (
            sections.map((section, index) => {
              const winner = getWinnerForSection(section);
              const hasWinner = !!winner;
              const isWinnerOverlayVisible = showWinnerOverlay === section.id;

              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {/* Winner Overlay - Shows on top when declared */}
                  <AnimatePresence>
                    {isWinnerOverlayVisible && winner && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-40 bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-xl"
                      >
                        <motion.div
                          initial={{ y: 20 }}
                          animate={{ y: 0 }}
                          className="relative bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl shadow-2xl max-w-2xl mx-auto p-6"
                        >
                          {/* Close Button */}
                          <button
                            onClick={() => toggleWinnerOverlay(section.id)}
                            className="absolute -top-3 -right-3 z-50 w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform hover:rotate-90 duration-300"
                          >
                            ✕
                          </button>

                          {/* Winner Header */}
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-full mb-3">
                              <span className="text-xl">🏆</span>
                              <span className="font-bold">ELECTION WINNER</span>
                            </div>
                            <h3 className="text-xl font-bold text-emerald-900">
                              {section.position}
                            </h3>
                          </div>

                          {/* Winner Content */}
                          <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Winner Photo */}
                            <div className="relative">
                              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-300 shadow-xl">
                                {winner.photoUrl ? (
                                  <img
                                    src={winner.photoUrl}
                                    alt={winner.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src =
                                        "https://via.placeholder.com/112/10b981/ffffff?text=" +
                                        winner.name.charAt(0);
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-2xl">
                                      {getInitials(winner.name)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                <span className="text-2xl">👑</span>
                              </div>
                            </div>

                            {/* Winner Info */}
                            <div className="flex-1">
                              <h4 className="text-2xl font-bold text-gray-900 mb-2">
                                {winner.name}
                              </h4>
                              <p className="text-emerald-600 font-medium mb-4">
                                {winner.position}
                              </p>

                              {/* Stats */}
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200">
                                  <div className="text-3xl font-bold text-emerald-700">
                                    {winner.vote_count || 0}
                                  </div>
                                  <p className="text-emerald-600 font-medium text-sm mt-1">
                                    Total Votes
                                  </p>
                                </div>
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200">
                                  <div className="text-3xl font-bold text-emerald-700">
                                    {section.candidates.length}
                                  </div>
                                  <p className="text-emerald-600 font-medium text-sm mt-1">
                                    Total Candidates
                                  </p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-3">
                                <button
                                  className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium flex items-center gap-2 hover:scale-105"
                                  onClick={() => {
                                    setSelectedCandidate(winner);
                                    setShowDetails(true);
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  View Profile
                                </button>
                                <button
                                  className="px-5 py-3 border-2 border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium flex items-center gap-2 hover:scale-105"
                                  onClick={() => {
                                    toggleWinnerOverlay(section.id);
                                    if (!section.isOpen) {
                                      toggleSection(section.id);
                                    }
                                  }}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                  </svg>
                                  View Results
                                </button>
                                <button
                                  className="px-5 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center gap-2 hover:scale-105"
                                  onClick={() =>
                                    toggleWinnerOverlay(section.id)
                                  }
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Section Content */}
                  <div
                    className={`bg-white rounded-xl shadow-lg border border-slate-200 transition-all duration-300 ${
                      isWinnerOverlayVisible ? "opacity-30 blur-sm" : ""
                    }`}
                  >
                    {/* Section Header */}
                    <div
                      className={`p-4 sm:p-5 border-b border-slate-200 cursor-pointer transition-all duration-300 ${
                        hasWinner
                          ? "bg-gradient-to-r from-emerald-50 to-green-50"
                          : ""
                      }`}
                      onClick={() => toggleSection(section.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-3">
                          <motion.div
                            animate={{ rotate: section.isOpen ? 90 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <svg
                              className={`w-5 h-5 mt-1 sm:mt-0 flex-shrink-0 ${
                                hasWinner
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </motion.div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3
                                className={`text-lg font-bold ${
                                  hasWinner
                                    ? "bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent"
                                    : "bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
                                }`}
                              >
                                {section.name}
                              </h3>
                              {hasWinner && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full animate-pulse"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span className="text-xs font-bold">
                                    WINNER
                                  </span>
                                </motion.div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <p
                                className={`text-sm ${
                                  hasWinner
                                    ? "text-emerald-600 font-semibold"
                                    : "text-slate-600"
                                }`}
                              >
                                Position: {section.position}
                              </p>
                              <span
                                className={`text-sm font-medium px-3 py-1 rounded-full ${
                                  hasWinner
                                    ? "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {section.candidates.length} candidate
                                {section.candidates.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                          {section.candidates.length > 0 &&
                            !hasWinner &&
                            electionStatus === "ended" &&
                            !electionMeta.auto_declare_enabled && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeclareWinnerBackend(section.id);
                                }}
                                disabled={declaringWinner}
                                className={`relative overflow-hidden group flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-xl transition-all duration-300 ${
                                  declaringWinner
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/20 to-yellow-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                {declaringWinner ? (
                                  <span className="flex items-center gap-2">
                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    Declaring...
                                  </span>
                                ) : (
                                  <>
                                    <svg
                                      className="w-3 h-3 sm:w-4 sm:h-4 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                      />
                                    </svg>
                                    <span className="relative hidden sm:inline">
                                      Declare Winner
                                    </span>
                                    <span className="relative sm:hidden">
                                      🏆
                                    </span>
                                  </>
                                )}
                              </motion.button>
                            )}
                          {electionStatus === "scheduled" && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData((prev) => ({
                                  ...prev,
                                  sectionId: section.id,
                                }));
                                setShowForm(true);
                              }}
                              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg
      bg-gradient-to-r from-blue-500 to-blue-600 text-white
      hover:from-blue-600 hover:to-blue-700 shadow-md cursor-pointer hover:shadow-lg"
                            >
                              <svg
                                className="w-3 h-3 sm:w-4 sm:h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              <span className="hidden sm:inline">
                                Add Candidate
                              </span>
                              <span className="sm:hidden">Add</span>
                            </motion.button>
                          )}

                          {electionStatus === "scheduled" &&
                            sections.length > 1 && (
                              <button
                                onClick={(e) =>
                                  handleDeleteSectionClick(section.id, e)
                                }
                                disabled={hasWinner}
                                className={`p-2 rounded-lg cursor-pointer transition-colors hover:scale-110 ${
                                  hasWinner
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-red-600 hover:bg-red-50"
                                }`}
                                title={
                                  hasWinner
                                    ? "Cannot delete position with winner"
                                    : "Delete position"
                                }
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Candidate List */}
                    <AnimatePresence>
                      {section.isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {section.candidates.length === 0 ? (
                            <div className="text-center py-10 px-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg
                                  className="w-8 h-8 text-blue-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                  />
                                </svg>
                              </div>
                              <h4 className="text-lg font-semibold text-slate-900 mb-2">
                                No candidates for {section.position}
                              </h4>
                              <p className="text-slate-600 mb-4 text-sm">
                                Be the first to add a candidate for this
                                position.
                              </p>
                              <button
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    sectionId: section.id,
                                  }));
                                  setShowForm(true);
                                }}
                                disabled={hasWinner}
                                className={`px-5 py-2.5 cursor-pointer font-medium rounded-lg transition-all ${
                                  hasWinner
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                                }`}
                              >
                                {hasWinner
                                  ? "Cannot add candidates (winner declared)"
                                  : "Add First Candidate"}
                              </button>
                            </div>
                          ) : (
                            <div className="p-4 sm:p-5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {section.candidates.map((candidate, idx) => (
                                  <motion.div
                                    key={candidate.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`bg-white rounded-xl p-3 border-2 ${
                                      hasWinner && candidate.id === winner?.id
                                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-lg"
                                        : "border-gray-200 hover:border-blue-300"
                                    } shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-1`}
                                  >
                                    <div className="flex flex-col items-center text-center">
                                      {/* Candidate Photo */}
                                      <div className="relative mb-3 w-full aspect-square max-w-32 mx-auto">
                                        <div className="w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-white">
                                          {hasWinner &&
                                            candidate.id === winner?.id && (
                                              <div className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow animate-pulse">
                                                <svg
                                                  className="w-4 h-4 text-white"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                              </div>
                                            )}
                                          {candidate.photoUrl ? (
                                            <img
                                              src={candidate.photoUrl}
                                              alt={candidate.name}
                                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                            />
                                          ) : (
                                            <div
                                              className={`w-full h-full ${
                                                hasWinner &&
                                                candidate.id === winner?.id
                                                  ? "bg-gradient-to-br from-emerald-600 to-green-600"
                                                  : "bg-gradient-to-br from-blue-600 to-indigo-600"
                                              } flex items-center justify-center`}
                                            >
                                              <span className="text-white font-bold text-xl">
                                                {getInitials(candidate.name)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Candidate Info */}
                                      <div className="w-full mb-3 space-y-1.5">
                                        <h5
                                          className={`font-semibold ${
                                            hasWinner &&
                                            candidate.id === winner?.id
                                              ? "text-emerald-800"
                                              : "text-slate-900"
                                          } text-base truncate`}
                                        >
                                          {candidate.name}
                                        </h5>

                                        <div
                                          className={`text-xs font-semibold px-2 py-1 rounded-md inline-block ${
                                            hasWinner &&
                                            candidate.id === winner?.id
                                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                                              : "text-blue-700 bg-blue-50"
                                          }`}
                                        >
                                          {candidate.position}
                                        </div>

                                        {candidate.candidate_id && (
                                          <div className="text-xs text-slate-600 font-medium">
                                            ID: {candidate.candidate_id}
                                          </div>
                                        )}

                                        {(electionStatus === "active" ||
                                          electionStatus === "ended") && (
                                          <div className="mt-2">
                                            <div
                                              className={`text-xs font-bold ${
                                                hasWinner &&
                                                candidate.id === winner?.id
                                                  ? "text-emerald-600"
                                                  : "text-blue-600"
                                              }`}
                                            >
                                              Votes: {candidate.vote_count ?? 0}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex gap-2 w-full">
                                        <motion.button
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() =>
                                            handleViewDetails(candidate)
                                          }
                                          className={`flex-1 px-3 cursor-pointer py-2 rounded-lg transition-colors font-medium text-xs ${
                                            hasWinner &&
                                            candidate.id === winner?.id
                                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                              : "bg-blue-600 text-white hover:bg-blue-700"
                                          }`}
                                        >
                                          View
                                        </motion.button>

                                        {electionStatus === "scheduled" &&
                                          !hasWinner && (
                                            <motion.button
                                              whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
                                              onClick={() =>
                                                handleDeleteClick(candidate)
                                              }
                                              className={`flex-1 cursor-pointer px-3 py-2 rounded-lg transition-colors font-medium text-xs ${
                                                hasWinner
                                                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                                  : "bg-red-500 text-white hover:bg-red-600"
                                              }`}
                                            >
                                              Delete
                                            </motion.button>
                                          )}
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              ref={formModalRef}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl mx-2 border border-gray-200"
            >
              {/* Header */}
              <div className="border-b border-gray-200">
                <div className="px-4 sm:px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Add New Candidate
                      </h2>
                      <p className="text-gray-600 text-sm mt-1 truncate">
                        {electionMeta.electionName}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowForm(false)}
                      className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {/* Content - Compact Layout */}
              <div className="p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Section Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Election Position *
                      {formErrors.sectionId && (
                        <span className="text-red-600 text-xs ml-2">
                          ({formErrors.sectionId})
                        </span>
                      )}
                    </label>
                    <select
                      name="sectionId"
                      value={formData.sectionId || ""}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400 ${
                        formErrors.sectionId
                          ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">Choose an election position</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.position}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Photo Upload - Left Column */}
                    <div className="lg:col-span-1">
                      <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl p-4 border border-blue-100 h-full">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Profile Photo
                        </h3>

                        <div className="flex flex-col items-center">
                          {/* Photo Preview - Smaller */}
                          <div className="relative w-24 h-24 mb-3">
                            {photo ? (
                              <>
                                <img
                                  src={URL.createObjectURL(photo)}
                                  alt="Preview"
                                  className="w-full h-full rounded-lg object-cover border-2 border-white shadow"
                                />
                                <button
                                  type="button"
                                  onClick={() => setPhoto(null)}
                                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs"
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                                <svg
                                  className="w-8 h-8 mb-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* File Input */}
                          <label className="w-full cursor-pointer">
                            <input
                              type="file"
                              name="photo"
                              onChange={handleInputChange}
                              accept="image/*"
                              className="hidden"
                            />
                            <div className="w-full px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium transition-all duration-200 flex items-center justify-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                              {photo ? "Change" : "Upload"}
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Personal Information - Middle Column */}
                    <div className="lg:col-span-1">
                      <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl p-4 border border-blue-100 h-full">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Personal Info
                        </h3>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Full Name *
                              {formErrors.name && (
                                <span className="text-red-600 text-xs ml-1">
                                  ({formErrors.name})
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleInputChange}
                              required
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400 ${
                                formErrors.name
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-300"
                              }`}
                              placeholder="Candidate name"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Age
                              </label>
                              <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400"
                                placeholder="Age"
                                min="1"
                                max="100"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Gender
                              </label>
                              <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400"
                              >
                                <option value="">Select</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="others">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information - Right Column */}
                    <div className="lg:col-span-1">
                      <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl p-4 border border-blue-100 h-full">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          Contact Info
                        </h3>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Email *
                              {formErrors.email && (
                                <span className="text-red-600 text-xs ml-1">
                                  ({formErrors.email})
                                </span>
                              )}
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400 ${
                                formErrors.email
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-300"
                              } ${
                                fieldFocus === "email"
                                  ? "ring-2 ring-blue-200"
                                  : ""
                              }`}
                              placeholder="email@example.com"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Phone *
                              {formErrors.phone_number && (
                                <span className="text-red-600 text-xs ml-1">
                                  ({formErrors.phone_number})
                                </span>
                              )}
                            </label>
                            <input
                              type="tel"
                              name="phone_number"
                              value={formData.phone_number}
                              onChange={handleInputChange}
                              required
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400 ${
                                formErrors.phone_number
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-300"
                              } ${
                                fieldFocus === "phone_number"
                                  ? "ring-2 ring-blue-200"
                                  : ""
                              }`}
                              placeholder="Phone number"
                              maxLength={10}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              WhatsApp
                              {formErrors.whatsApp_number && (
                                <span className="text-red-600 text-xs ml-1">
                                  ({formErrors.whatsApp_number})
                                </span>
                              )}
                            </label>
                            <input
                              type="tel"
                              name="whatsApp_number"
                              value={formData.whatsApp_number}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200 hover:border-blue-400 ${
                                formErrors.whatsApp_number
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-300"
                              }`}
                              placeholder="WhatsApp number"
                              maxLength={10}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Bottom */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 cursor-pointer px-4 py-2.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="flex-1 cursor-pointer px-4 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Adding...
                        </span>
                      ) : (
                        "Add Candidate"
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidate Details Modal */}
      <AnimatePresence mode="wait">
        {showDetails && selectedCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 300,
                duration: 0.3,
              }}
              ref={detailsModalRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md sm:max-w-lg lg:max-w-xl mx-2 border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-5 py-3.5 sm:py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                        {selectedCandidate.name}
                      </h2>
                      <p className="text-blue-100 text-sm mt-0.5">
                        {selectedCandidate.position} • ID:{" "}
                        {selectedCandidate.candidate_id || "N/A"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="w-8 cursor-pointer h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-red-900 rounded-lg flex items-center justify-center text-white transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content - No Scroll */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col md:flex-row gap-4 sm:gap-5">
                  {/* Left Column - Profile */}
                  <div className="md:w-2/5">
                    <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                      <div className="flex flex-col items-center">
                        {/* Profile Image */}
                        <div className="relative mb-4">
                          {selectedCandidate.photoUrl ? (
                            <img
                              src={selectedCandidate.photoUrl}
                              alt={selectedCandidate.name}
                              className="w-20 h-20 sm:w-24 sm:h-24  border-1 border-white shadow"
                            />
                          ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center border-4 border-white shadow">
                              <span className="text-white font-bold text-base sm:text-lg">
                                {getInitials(selectedCandidate.name)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Quick Stats - 3 in a grid */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                          {/* Age */}
                          <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Age</p>
                            <p className="text-base font-bold text-gray-900">
                              {selectedCandidate.age || "N/A"}
                            </p>
                          </div>

                          {/* Gender */}
                          <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Gender</p>
                            <p className="text-base font-semibold text-gray-900 capitalize">
                              {selectedCandidate.gender || "N/A"}
                            </p>
                          </div>

                          {/* Show vote count only when election is active or ended (not scheduled) */}
                          {electionStatus !== "scheduled" &&
                            selectedCandidate.vote_count !== undefined && (
                              <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200 mt-2">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                                    <svg
                                      className="w-4 h-4 text-blue-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-gray-600 mb-1">
                                      Votes Received
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {selectedCandidate.vote_count || 0}
                                      <span className="text-sm text-gray-500 font-normal ml-1">
                                        votes
                                      </span>
                                    </p>
                                  </div>
                                </div>
                                {/* Election status indicator */}
                                <div className="mt-2 text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <svg
                                      className="w-3 h-3 mr-1"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {electionStatus === "active"
                                      ? "Voting in Progress"
                                      : "Election Completed"}
                                  </span>
                                </div>
                              </div>
                            )}

                          {/* Show status indicator when election is scheduled */}
                          {electionStatus === "scheduled" && (
                            <div className="col-span-2 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3 border border-yellow-200 mt-2">
                              <div className="flex items-center justify-center gap-2">
                                <div className="p-2 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg">
                                  <svg
                                    className="w-4 h-4 text-yellow-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600 mb-1">
                                    Current Status
                                  </p>
                                  <p className="text-base font-semibold text-gray-900">
                                    Election Scheduled
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Voting Not Started
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Contact Info */}
                  <div className="md:w-3/5">
                    <div className="space-y-4">
                      {/* Email */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 text-sm font-bold">
                                @
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Email Address
                            </span>
                          </div>
                          <a
                            href={`mailto:${selectedCandidate.email}`}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Send email →
                          </a>
                        </div>
                        <p
                          className="text-base text-gray-900 font-medium truncate"
                          title={selectedCandidate.email}
                        >
                          {selectedCandidate.email}
                        </p>
                      </div>

                      {/* Phone */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-green-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Phone Number
                            </span>
                          </div>
                          <a
                            href={`tel:${selectedCandidate.phone}`}
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Call now →
                          </a>
                        </div>
                        <p className="text-base text-gray-900 font-medium">
                          {selectedCandidate.phone}
                        </p>
                      </div>

                      {/* WhatsApp */}
                      {selectedCandidate.whatsapp && (
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-emerald-600"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.76.982.998-3.677-.236-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.9 6.994c-.004 5.45-4.436 9.884-9.884 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.333.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.333 11.893-11.893 0-3.18-1.24-6.162-3.495-8.411z" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                WhatsApp
                              </span>
                            </div>
                            <a
                              href={`https://wa.me/${selectedCandidate.whatsapp.replace(
                                /\D/g,
                                ""
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-full hover:bg-emerald-600 transition-colors"
                            >
                              Message
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </a>
                          </div>
                          <p className="text-base text-gray-900 font-medium">
                            {selectedCandidate.whatsapp}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Last updated: Today •
                    <span
                      className={`ml-2 font-medium ${
                        electionStatus === "scheduled"
                          ? "text-yellow-600"
                          : "text-blue-600"
                      }`}
                    >
                      {electionStatus === "scheduled"
                        ? "Voting Not Started"
                        : electionStatus === "active"
                        ? "Voting in Progress"
                        : "Election Completed"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Candidate Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && candidateToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              ref={deleteModalRef}
              className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-md mx-2"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Delete Candidate
                    </h3>
                    <p className="text-sm text-slate-600">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                <p className="text-slate-600 mb-6">
                  Are you sure you want to delete{" "}
                  <strong className="text-slate-900">
                    {candidateToDelete.name}
                  </strong>
                  ? This will remove the candidate from the election
                  permanently.
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setCandidateToDelete(null);
                    }}
                    className="flex-1 cursor-pointer px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all duration-300"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmDelete}
                    className="flex-1 cursor-pointer px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-semibold transition-all duration-300 hover:shadow-lg"
                  >
                    Delete Candidate
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Section Confirmation Modal */}
      <AnimatePresence>
        {showDeleteSectionConfirm && sectionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              ref={deleteSectionModalRef}
              className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-md mx-2"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Delete Position
                    </h3>
                    <p className="text-sm text-slate-600">
                      This will delete the position and all its candidates
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-800 font-medium mb-2">⚠️ Warning!</p>
                  <p className="text-sm text-red-700">
                    Deleting{" "}
                    <strong className="font-semibold">
                      {sectionToDelete.name}
                    </strong>{" "}
                    will remove all {sectionToDelete.candidates.length}{" "}
                    candidate
                    {sectionToDelete.candidates.length !== 1 ? "s" : ""} in this
                    position. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowDeleteSectionConfirm(false);
                      setSectionToDelete(null);
                    }}
                    className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold transition-all duration-300"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmDeleteSection}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-semibold transition-all duration-300 hover:shadow-lg"
                  >
                    Delete Position
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-slate-200 pt-8 mt-8">
        <ElectionDashboard key={dashboardRefreshKey} />
      </div>
    </div>
  );
};

export default CandidateDashboard;
