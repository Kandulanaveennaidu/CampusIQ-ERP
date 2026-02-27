"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { PhotoUpload } from "@/components/ui/photo-upload";

interface StudentFormData {
  name: string;
  roll_number: string;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  email: string;
  address: string;
  photo: string;
}

interface StudentFormProps {
  initialData?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  classes: string[];
  classLabel?: string;
}

export function StudentForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
  classes,
  classLabel = "Class",
}: StudentFormProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    name: initialData?.name || "",
    roll_number: initialData?.roll_number || "",
    class_name: initialData?.class_name || "",
    parent_name: initialData?.parent_name || "",
    parent_phone: initialData?.parent_phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    photo: initialData?.photo || "",
  });

  const [errors, setErrors] = useState<Partial<StudentFormData>>({});

  const validate = (): boolean => {
    const newErrors: Partial<StudentFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!formData.roll_number.trim()) {
      newErrors.roll_number = "Roll number is required";
    }
    if (!formData.class_name) {
      newErrors.class_name = "Class is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (
      formData.parent_phone &&
      !/^[0-9]{10}$/.test(formData.parent_phone.replace(/[-\s]/g, ""))
    ) {
      newErrors.parent_phone = "Invalid phone number (10 digits required)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo */}
      <div className="flex justify-center">
        <PhotoUpload
          value={formData.photo}
          onChange={(dataUrl) => setFormData({ ...formData, photo: dataUrl })}
        />
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Student Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter student name"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
      </div>

      {/* Roll Number */}
      <div className="space-y-2">
        <Label htmlFor="roll_number">
          Roll Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id="roll_number"
          value={formData.roll_number}
          onChange={(e) =>
            setFormData({ ...formData, roll_number: e.target.value })
          }
          placeholder="e.g., 101"
        />
        {errors.roll_number && (
          <p className="text-xs text-red-500">{errors.roll_number}</p>
        )}
      </div>

      {/* Class / Year / Batch — dynamic per institution category */}
      <div className="space-y-2">
        <Label htmlFor="class_name">
          {classLabel} <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="class_name"
            list="class-options"
            value={formData.class_name}
            onChange={(e) =>
              setFormData({ ...formData, class_name: e.target.value })
            }
            placeholder={`Select or type ${classLabel.toLowerCase()}`}
            autoComplete="off"
          />
          <datalist id="class-options">
            {classes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        {errors.class_name && (
          <p className="text-xs text-red-500">{errors.class_name}</p>
        )}
      </div>

      {/* Parent Name */}
      <div className="space-y-2">
        <Label htmlFor="parent_name">Parent Name</Label>
        <Input
          id="parent_name"
          value={formData.parent_name}
          onChange={(e) =>
            setFormData({ ...formData, parent_name: e.target.value })
          }
          placeholder="Enter parent name"
        />
      </div>

      {/* Parent Phone */}
      <div className="space-y-2">
        <Label htmlFor="parent_phone">Parent Phone</Label>
        <Input
          id="parent_phone"
          value={formData.parent_phone}
          onChange={(e) =>
            setFormData({ ...formData, parent_phone: e.target.value })
          }
          placeholder="10-digit phone number"
        />
        {errors.parent_phone && (
          <p className="text-xs text-red-500">{errors.parent_phone}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="student@example.com"
        />
        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          placeholder="Enter address"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : initialData?.name ? (
            "Update Student"
          ) : (
            "Add Student"
          )}
        </Button>
      </div>
    </form>
  );
}
